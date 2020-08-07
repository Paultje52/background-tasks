if (process.version.split("v")[1].split(".")[0] < 12 ||
process.version.split("v")[1].split(".")[1] < 5) throw new Error("Node v12.5.0 or higher is required for background-tasks");

const workerThreads = require("worker_threads");
const path = require("path");
let totalThreads = require("os").cpus().length;

class backgroundTasks {
  constructor({
    threads = totalThreads-1,
    variables = {}
  } = {}) {
    if (!workerThreads.isMainThread) throw new Error("Background tasks can only be constructed on the main thread!");
    this.workers = [];
    this._variables = {};
    this._events = {};
    this._stopedWorkers = [];
    this._callbacks = {};

    // Prepare variables for all workers
    for (let i in variables) {
      this.addVariable(i, variables[i]);
    }
    
    // Spawn the workers!
    for (let i = 0; i < threads; i++) {
      this.spawnWorker();
    }
  }
  
  executeNow(...args) {
    let func = args.pop();
    let force = false;
    if (typeof func === "boolean") {
      force = func;
      func = args.pop();
    }
    return new Promise((res) => {
      let worker = this.workers.sort((a, b) => a.tasks.length-b.tasks.length)[0];
      if (force) return this._startWorkerTask(worker, func, args).then(res);
      worker.tasks = [{
        callback: res,
        code: func,
        args: args
      }, ...worker.tasks];
    });
  }
  
  executeWhen(...args) {
    let func = args.pop();
    let checkInterval = 100;
    if (typeof func === "number") {
      checkInterval = func;
      func = args.pop();
    }
    let test = args.pop();
    return new Promise((res) => {
      let i = setInterval(() => {
        if (!test()) return;
        clearInterval(i);
        this.executeNow(...args, func).then(res);
      }, checkInterval);
    });
  }
  
  executeIn(...args) {
    let func = args.pop();
    let time = args.pop();
    return new Promise((res) => {
      setTimeout(() => {
        this.executeNow(...args, func).then(res);
      }, time);
    });
  }
  
  executeEach(...args) {
    let callback = args.pop();
    let func = args.pop();
    let time;
    if (typeof func === "number") {
      time = func;
      func = callback;
      callback = () => {};
    }
    if (!time) time = args.pop();
    return setInterval(() => {
      this.executeNow(...args, func).then(callback);
    }, time);
  }
  
  addVariable(name, value, sendToWorkers = true) {
    if (typeof value === "object" && value._customClass && value.classVar && value.instance) {
      let val = value.classVar.toString();
      if (!val.startsWith("class")) throw new Error("This can only be used for custom classes!");
      let className = val.split(" ")[1];
      
      this._variables[name] = {
        _nodeBackgroundTasksPrototype: true,
        instance: JSON.stringify(value.instance),
        className: className,
        code: val
      }
    } else this._variables[name] = JSON.stringify(value);
    
    if (!sendToWorkers) return;
    this._sendToAllWorkers(name, this._variables[name]);
  }
  
  
  /*
    Worker stuff
  */
  spawnWorker() {
    let workerPath = path.join(__dirname, "worker.js");
    let worker = new workerThreads.Worker(workerPath);
    this._addWorker(worker);
  }
  _sendDataToEachWorker(data) {
    this.workers.forEach(worker => {
      _sendDataToProcess(worker.process, data);
    });
  }
  _sendDataToProcess(process, data) {
    process.postMessage(data);
  }
  _sendToAllWorkers(name, value) {
    let data = {};
    data[name] = value;
    data = `0${JSON.stringify(data)}`;
    this._sendDataToEachWorker(data);
  }
  _addWorker(worker) {
    this._addWorkerListeners(worker);
    this._sendDataToProcess(worker, `0${JSON.stringify(this._variables)}`);
    this.workers.push({
      process: worker,
      tasks: []
    });
    this._checkWorkerLoop(this.workers[this.workers.length-1]);
  }
  async _checkWorkerLoop(worker) {
    if (this._stopedWorkers.includes(worker)) return;
    let task = worker.tasks.shift();
    if (!task) return setTimeout(() => {this._checkWorkerLoop(worker)}, 100);
    let result = await this._startWorkerTask(worker, task.code, task.args);
    task.callback(result);
    this._checkWorkerLoop(worker);
  }
  _startWorkerTask(worker, code, args) {
    return new Promise((res) => {
      let id = Math.random().toString(36).substring(7);
      this._callbacks[id] = res;
      this._sendDataToProcess(worker.process, `1${JSON.stringify({id: id, args: args, task: code.toString()})}`);
    });
  }
  _addWorkerListeners(worker) {
    worker.on("error", (error) => {
      this._trigger("workerError", [worker, error], () => {
        throw new Error(`Worker ${worker.pid} error: ${error.toString()}`);
      });
    });
    worker.on("exit", (code) => {
      this._trigger("workerExit", [worker, code]);
      console.log(`Worker ${worker.pid} exit with code ${code}. Restarting worker...`);
      this._removeWorker(worker);
      this.spawnWorker();
    });
    worker.on("message", (m) => {
      try {
        m = JSON.parse(m);
      } catch(e) {
        return console.log(`From worker ${worker.pid}:`, m);
      };
      if (!this._callbacks[m.id]) return console.error(`Callback with ID ${m.id} is missing!`);
      this._callbacks[m.id](m.result);
      delete this._callbacks[m.id];
    });
  }
  _removeWorker(worker) {
    let newWorkers = [];
    this.workers.forEach(w => {
      if (w !== worker) newWorkers.push(w);
      else this._stopedWorkers.push(w);
    });
    this.workers = newWorkers;
  }

  /*
    Custom event emiter
  */
  on(event, func) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(func);
  }
  _trigger(event, parameters, noListeners = () => {}) {
    let triggers = this._events[event];
    if (!triggers) return noListeners(...parameters);
    triggers.forEach((f) => {
      f(...parameters);
    });
  }
}

module.exports = backgroundTasks;