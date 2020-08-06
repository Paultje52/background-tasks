class Logger {
  constructor(prefix = "") {
    this.prefix = prefix;
  }
  
  log(msg) {
    console.log(this.prefix, msg);
  }
  
  warn(msg) {
    console.warn(this.prefix, "[warn]", msg);
  }
  
  error(msg) {
    console.error(this.prefix, "[error]", msg);
  }
}

module.exports = Logger;