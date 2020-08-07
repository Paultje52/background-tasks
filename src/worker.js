const workerThreads = require("worker_threads");

let vars = {};
let variables = vars;

workerThreads.parentPort.on("message", (msg) => {
  msg = msg.split(""); // 1<DATA>
  let id = msg.shift();
  msg = msg.join("");
  
  try {
    msg = JSON.parse(msg);
  } catch(e) {}
  
  if (id == 0) {
    // New variable
    for (let i in msg) {
      let content = msg[i];
      try {
        content = JSON.parse(content);
      } catch(e) {}
      if (typeof content === "object" && content._nodeBackgroundTasksPrototype && content.instance && content.className && content.code) {
        let tmp = JSON.parse(content.instance);
        tmp.__proto__ = eval(`${content.code};\n${content.className}.prototype`);
        content = tmp;
      }
      vars[i] = content;
    }
  } else if (id == 1) {
    if (!msg.args) msg.args = [];
    eval(`
      let _res = ${msg.task};
      let _args = ${JSON.stringify(msg.args)};
      setTimeout(async () => {
        workerThreads.parentPort.postMessage(
          JSON.stringify({id: "${msg.id}", result: await _res(..._args)})
        );
      });`);
  }
});