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
      if (typeof content === "object" && content._nodeBackgroundTasksPrototype && content.instance && content.className && content.code) {
        let tmp = JSON.parse(content.instance);
        tmp.__proto__ = eval(`${content.code};\n${content.className}.prototype`);
        content = tmp;
      }
      vars[i] = content;
    }
  } else if (id == 1) {
    let id = msg.id;
    let code = msg.task;
    eval(`
      let _res = ${code};
      setTimeout(async () => {
        workerThreads.parentPort.postMessage(
          JSON.stringify({id: "${id}", result: await _res()})
        );
      });`);
  }
});