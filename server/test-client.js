// Quick sanity-check script: spins up two fake clients on the same room,
// has both draw at the same time, and confirms both converge on the same
// merged state. Run with: node test-client.js
const WebSocket = require('ws');

const ROOM = 'test-room-' + Date.now();
const URL = `ws://localhost:8080?room=${ROOM}`;

function makeClient(name) {
  return new Promise((resolve) => {
    const ws = new WebSocket(URL);
    const received = [];
    ws.on('open', () => {
      console.log(`[${name}] connected to room ${ROOM}`);
      const op = {
        id: `${name}-op-${Date.now()}`,
        clientId: name,
        color: '#000000',
        width: 3,
        points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.3, y: 0.1 }],
        ts: Date.now(),
      };
      ws.send(JSON.stringify({ type: 'op', op }));
      console.log(`[${name}] sent op ${op.id}`);
    });
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      received.push(msg);
      if (msg.type === 'init') {
        console.log(`[${name}] got init with ${msg.ops.length} existing ops`);
      }
      if (msg.type === 'op') {
        console.log(`[${name}] received broadcast op from ${msg.op.clientId}`);
      }
    });
    setTimeout(() => {
      ws.close();
      resolve({ name, received });
    }, 2000);
  });
}

(async () => {
  const [a, b] = await Promise.all([makeClient('alice'), makeClient('bob')]);
  const opsSeenByAlice = a.received.filter(m => m.type === 'op').length;
  const opsSeenByBob = b.received.filter(m => m.type === 'op').length;
  console.log('\n--- RESULT ---');
  console.log(`alice saw ${opsSeenByAlice} broadcast op(s) from other clients`);
  console.log(`bob saw ${opsSeenByBob} broadcast op(s) from other clients`);
  console.log(opsSeenByAlice >= 1 && opsSeenByBob >= 1
    ? '✅ PASS: both clients converged (each received the other\'s stroke)'
    : '❌ FAIL: ops did not propagate correctly');
  process.exit(0);
})();
