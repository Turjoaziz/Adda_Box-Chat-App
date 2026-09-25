import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Run the actual inline client code with small DOM/socket substitutes.
// No database, browser, network connection, or additional package is required.
const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const clientCode = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n");
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString("base64url")}.signature`;

function setup() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      value: id === "room" ? "general" : "", textContent: "", innerHTML: "",
      children: [], addEventListener() {},
      appendChild(child) { this.children.push(child); }
    });
    return elements.get(id);
  };
  const sockets = [];
  const storage = new Map();
  const context = vm.createContext({
    document: { getElementById: element, createElement: () => ({ textContent: "" }) },
    window: { addEventListener() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    atob: value => Buffer.from(value, "base64").toString("binary"),
    fetch: () => { throw new Error("Unexpected network request in this test"); },
    io: () => {
      const handlers = new Map();
      const socket = {
        connected: false, emitted: [], disconnectCalls: 0,
        on(event, handler) { handlers.set(event, handler); },
        emit(event, payload) { this.emitted.push([event, JSON.parse(JSON.stringify(payload))]); },
        removeAllListeners() { handlers.clear(); },
        disconnect() { this.disconnectCalls++; this.connected = false; },
        trigger(event, payload) {
          if (event === "connect") this.connected = true;
          if (event === "disconnect") this.connected = false;
          handlers.get(event)?.(payload);
        }
      };
      sockets.push(socket);
      return socket;
    }
  });
  vm.runInContext(clientCode, context);
  context.saveToken(token);
  context.connect();
  const logs = () => element("log").children.map(child => child.textContent);
  return { context, element, sockets, storage, logs };
}

function join(app, room = "general") {
  const socket = app.sockets.at(-1);
  app.element("room").value = room;
  app.element("btnJoin").onclick();
  socket.trigger("room:joined", room);
}

test("joining is reported only after server confirmation", () => {
  const app = setup();
  const socket = app.sockets[0];
  socket.trigger("connect");
  app.element("btnJoin").onclick();
  assert.deepEqual(socket.emitted, [["room:join", "general"]]);
  assert.ok(!app.logs().includes("Joined room: general"));
  socket.trigger("room:joined", "general");
  assert.ok(app.logs().includes("Joined room: general"));
});

test("reconnect restores each confirmed room once, regardless of the edited room input", () => {
  const app = setup();
  const socket = app.sockets[0];
  socket.trigger("connect");
  join(app, "general");
  join(app, "study");
  join(app, "general");
  app.element("room").value = "not-joined";
  socket.emitted.length = 0;
  socket.trigger("disconnect");
  assert.match(app.element("connectionStatus").textContent, /Disconnected/);
  socket.trigger("connect");
  assert.deepEqual(socket.emitted, [["room:join", "general"], ["room:join", "study"]]);
  assert.equal(app.element("connectionStatus").textContent, "Connected.");
});

test("offline send preserves the draft and queues neither messages nor room joins", () => {
  const app = setup();
  const socket = app.sockets[0];
  socket.trigger("connect");
  join(app);
  socket.trigger("disconnect");
  socket.emitted.length = 0;
  app.element("msg").value = "Keep this draft";
  app.element("btnSend").onclick();
  app.element("btnJoin").onclick();
  assert.equal(app.element("msg").value, "Keep this draft");
  assert.deepEqual(socket.emitted, []);
  assert.ok(app.logs().some(line => line.includes("you are offline")));
});

test("sending waits for room confirmation after reconnect, then works normally", () => {
  const app = setup();
  const socket = app.sockets[0];
  socket.trigger("connect");
  join(app);
  socket.trigger("disconnect");
  socket.trigger("connect");
  socket.emitted.length = 0;
  app.element("msg").value = "Hello again";
  app.element("btnSend").onclick();
  assert.equal(app.element("msg").value, "Hello again");
  assert.deepEqual(socket.emitted, []);
  socket.trigger("room:joined", "general");
  app.element("btnSend").onclick();
  assert.deepEqual(socket.emitted, [["message:send", { room: "general", body: "Hello again" }]]);
  assert.equal(app.element("msg").value, "");
});

test("an unjoined room cannot receive a send from this client", () => {
  const app = setup();
  const socket = app.sockets[0];
  socket.trigger("connect");
  join(app);
  socket.emitted.length = 0;
  app.element("room").value = "another-room";
  app.element("msg").value = "Draft";
  app.element("btnSend").onclick();
  assert.deepEqual(socket.emitted, []);
  assert.equal(app.element("msg").value, "Draft");
});

test("logout cancels an offline socket and clears rooms before the next login", () => {
  const app = setup();
  const old = app.sockets[0];
  old.trigger("connect");
  join(app);
  old.trigger("disconnect");
  old.emitted.length = 0;
  app.element("btnLogout").onclick();
  assert.equal(old.disconnectCalls, 1);
  assert.equal(app.storage.has("adda_token"), false);
  old.trigger("connect"); // Removed handlers must not change the logged-out UI.
  assert.match(app.element("connectionStatus").textContent, /Please log in/);
  assert.deepEqual(old.emitted, []);
  app.context.saveToken(token);
  app.context.connect();
  const current = app.sockets[1];
  current.trigger("connect");
  assert.deepEqual(current.emitted, []);
});

test("replacing a disconnected socket removes its listeners and reconnect attempts", () => {
  const app = setup();
  const old = app.sockets[0];
  app.context.connect();
  assert.equal(old.disconnectCalls, 1);
  old.trigger("connect_error", new Error("Invalid token"));
  assert.equal(app.storage.get("adda_token"), token);
  const current = app.sockets[1];
  current.trigger("connect");
  assert.equal(app.element("connectionStatus").textContent, "Connected.");
});

test("invalid token during reconnect ends the session", () => {
  const app = setup();
  const socket = app.sockets[0];
  socket.trigger("connect_error", new Error("Invalid token"));
  assert.equal(socket.disconnectCalls, 1);
  assert.equal(app.storage.has("adda_token"), false);
  assert.match(app.element("connectionStatus").textContent, /Please log in/);
});
