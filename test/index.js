// Loading the classes
const BackgroundQueue = require("../");
const Logger = require("./logger.js");
let someVariable = "Test!";

// Constructing some random class
let mainLogger = new Logger();

// Constructing Background-Tasks
let backgroundTasks = new BackgroundQueue({
  threads: 1, // Just one thread!
  variables: { // Variables available in every thread!
    logger: { // To send a class instance, we need to do it a litle bit different!
      _customClass: true,
      classVar: logger,
      instance: mainLogger
    },
    // Sending objects and variables, everything that can be used by JSON.stringify is possible!
    someVariable: someVariable,
    someObject: {
      a: "b",
      c: 1,
      d: {
        e: f,
        foo: "bar"
      }
    }
  }
});

// Adding another variable!
// This variable will be sent to every worker immediately
backgroundTasks.addVariable("name", {value: "foobar"});

// Execute a task now. This task takes one second, so the worker tasks will be queued after this!
backgroundTasks.executeNow(() => {
  return new Promise((res) => {
    setTimeout(1000, res, vars.someVariable);
  });
}).then(console.log);

// To force run something, because you want the result as soon as possible, set "true" after the function
// WARNING: Doing this can screw things up!
backgroundTasks.executeNow(() => {
  console.log("Force execution!");
}, true);

// Queue a task to run after X ms!
backgroundTasks.executeIn(100, () => {
  vars.logger.warn("There is only one thread, so this will be queued!");
});

// Execute a task when the first function returnes true
// For example: Do something when a file exists.
// It get tests every 100 ms
backgroundTasks.executeWhen(() => true, () => {
  console.log("When the condition is true!");
});

// You can also make an interval, to execute something each X ms!
// This example does something every 5 seconds!
backgroundTasks.executeEach(5000, () => {
  return 1+1;
}, (result) => {
  console.log(`Callback from interval, answer: ${result}!`);
});

// It get's bussy after a while, let's spawn another thread!
setTimeout(() => {
  backgroundTasks.spawnWorker();
}, 10000);