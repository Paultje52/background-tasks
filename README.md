# Background-Tasks
Queue background tasks for NodeJS on another thread!

> Requires NodeJS V12.5 or higher!

## Installation
- NPM: `npm i -s background-tasks`
- Yarn: `yarn add background-tasks`

## Example
```js 
const BackgroundTasks = require("background-tasks");
let threadManager = new BackgroundTasks();
threadManager.executeNow(() => {
  // Do stuff on another thread!
});
```
For a compleat example, look [here](https://github.com/Paultje52/background-tasks/blob/master/test/index.js)!

## Linkss
- [Github](https://github.com/Paultje52/background-tasks)
- [NPM](https://npmjs.com/background-tasks)
- [Documentation](https://github.com/Paultje52/background-tasks/wiki)