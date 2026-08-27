#!/usr/bin/env node
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/papaparse/papaparse.js
var require_papaparse = __commonJS({
  "node_modules/papaparse/papaparse.js"(exports, module) {
    (function(root, factory) {
      if (typeof define === "function" && define.amd) {
        define([], factory);
      } else if (typeof module === "object" && typeof exports !== "undefined") {
        module.exports = factory();
      } else {
        root.Papa = factory();
      }
    })(exports, function moduleFactory() {
      "use strict";
      var global = function() {
        if (typeof self !== "undefined") {
          return self;
        }
        if (typeof window !== "undefined") {
          return window;
        }
        if (typeof global !== "undefined") {
          return global;
        }
        return {};
      }();
      function getWorkerBlob() {
        var URL2 = global.URL || global.webkitURL || null;
        var code = moduleFactory.toString();
        return Papa2.BLOB_URL || (Papa2.BLOB_URL = URL2.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ", "(", code, ")();"], { type: "text/javascript" })));
      }
      var IS_WORKER = !global.document && !!global.postMessage, IS_PAPA_WORKER = global.IS_PAPA_WORKER || false;
      var workers = {}, workerIdCounter = 0;
      var Papa2 = {};
      Papa2.parse = CsvToJson;
      Papa2.unparse = JsonToCsv;
      Papa2.RECORD_SEP = String.fromCharCode(30);
      Papa2.UNIT_SEP = String.fromCharCode(31);
      Papa2.BYTE_ORDER_MARK = "\uFEFF";
      Papa2.BAD_DELIMITERS = ["\r", "\n", '"', Papa2.BYTE_ORDER_MARK];
      Papa2.WORKERS_SUPPORTED = !IS_WORKER && !!global.Worker;
      Papa2.NODE_STREAM_INPUT = 1;
      Papa2.LocalChunkSize = 1024 * 1024 * 10;
      Papa2.RemoteChunkSize = 1024 * 1024 * 5;
      Papa2.DefaultDelimiter = ",";
      Papa2.Parser = Parser;
      Papa2.ParserHandle = ParserHandle;
      Papa2.NetworkStreamer = NetworkStreamer;
      Papa2.FileStreamer = FileStreamer;
      Papa2.StringStreamer = StringStreamer;
      Papa2.ReadableStreamStreamer = ReadableStreamStreamer;
      if (typeof PAPA_BROWSER_CONTEXT === "undefined") {
        Papa2.DuplexStreamStreamer = DuplexStreamStreamer;
      }
      if (global.jQuery) {
        var $ = global.jQuery;
        $.fn.parse = function(options) {
          var config = options.config || {};
          var queue = [];
          this.each(function(idx) {
            var supported = $(this).prop("tagName").toUpperCase() === "INPUT" && $(this).attr("type").toLowerCase() === "file" && global.FileReader;
            if (!supported || !this.files || this.files.length === 0)
              return true;
            for (var i = 0; i < this.files.length; i++) {
              queue.push({
                file: this.files[i],
                inputElem: this,
                instanceConfig: $.extend({}, config)
              });
            }
          });
          parseNextFile();
          return this;
          function parseNextFile() {
            if (queue.length === 0) {
              if (isFunction(options.complete))
                options.complete();
              return;
            }
            var f = queue[0];
            if (isFunction(options.before)) {
              var returned = options.before(f.file, f.inputElem);
              if (typeof returned === "object") {
                if (returned.action === "abort") {
                  error("AbortError", f.file, f.inputElem, returned.reason);
                  return;
                } else if (returned.action === "skip") {
                  fileComplete();
                  return;
                } else if (typeof returned.config === "object")
                  f.instanceConfig = $.extend(f.instanceConfig, returned.config);
              } else if (returned === "skip") {
                fileComplete();
                return;
              }
            }
            var userCompleteFunc = f.instanceConfig.complete;
            f.instanceConfig.complete = function(results) {
              if (isFunction(userCompleteFunc))
                userCompleteFunc(results, f.file, f.inputElem);
              fileComplete();
            };
            Papa2.parse(f.file, f.instanceConfig);
          }
          function error(name, file, elem, reason) {
            if (isFunction(options.error))
              options.error({ name }, file, elem, reason);
          }
          function fileComplete() {
            queue.splice(0, 1);
            parseNextFile();
          }
        };
      }
      if (IS_PAPA_WORKER) {
        global.onmessage = workerThreadReceivedMessage;
      }
      function stripBom(string) {
        if (string.charCodeAt(0) === 65279) {
          return string.slice(1);
        }
        return string;
      }
      function CsvToJson(_input, _config) {
        _config = _config || {};
        var dynamicTyping = _config.dynamicTyping || false;
        if (isFunction(dynamicTyping)) {
          _config.dynamicTypingFunction = dynamicTyping;
          dynamicTyping = {};
        }
        _config.dynamicTyping = dynamicTyping;
        _config.transform = isFunction(_config.transform) ? _config.transform : false;
        if (_config.worker && Papa2.WORKERS_SUPPORTED) {
          var w = newWorker();
          w.userStep = _config.step;
          w.userChunk = _config.chunk;
          w.userComplete = _config.complete;
          w.userError = _config.error;
          _config.step = isFunction(_config.step);
          _config.chunk = isFunction(_config.chunk);
          _config.complete = isFunction(_config.complete);
          _config.error = isFunction(_config.error);
          delete _config.worker;
          w.postMessage({
            input: _input,
            config: _config,
            workerId: w.id
          });
          return;
        }
        var streamer = null;
        if (_input === Papa2.NODE_STREAM_INPUT && typeof PAPA_BROWSER_CONTEXT === "undefined") {
          streamer = new DuplexStreamStreamer(_config);
          return streamer.getStream();
        } else if (typeof _input === "string") {
          _input = stripBom(_input);
          if (_config.download)
            streamer = new NetworkStreamer(_config);
          else
            streamer = new StringStreamer(_config);
        } else if (_input.readable === true && isFunction(_input.read) && isFunction(_input.on)) {
          streamer = new ReadableStreamStreamer(_config);
        } else if (global.File && _input instanceof File || _input instanceof Object)
          streamer = new FileStreamer(_config);
        return streamer.stream(_input);
      }
      function JsonToCsv(_input, _config) {
        var _quotes = false;
        var _writeHeader = true;
        var _delimiter = ",";
        var _newline = "\r\n";
        var _quoteChar = '"';
        var _escapedQuote = _quoteChar + _quoteChar;
        var _skipEmptyLines = false;
        var _columns = null;
        var _escapeFormulae = false;
        unpackConfig();
        var quoteCharRegex = new RegExp(escapeRegExp(_quoteChar), "g");
        if (typeof _input === "string")
          _input = JSON.parse(_input);
        if (Array.isArray(_input)) {
          if (!_input.length || Array.isArray(_input[0]))
            return serialize(null, _input, _skipEmptyLines);
          else if (typeof _input[0] === "object")
            return serialize(_columns || Object.keys(_input[0]), _input, _skipEmptyLines);
        } else if (typeof _input === "object") {
          if (typeof _input.data === "string")
            _input.data = JSON.parse(_input.data);
          if (Array.isArray(_input.data)) {
            if (!_input.fields)
              _input.fields = _input.meta && _input.meta.fields || _columns;
            if (!_input.fields)
              _input.fields = Array.isArray(_input.data[0]) ? _input.fields : typeof _input.data[0] === "object" ? Object.keys(_input.data[0]) : [];
            if (!Array.isArray(_input.data[0]) && typeof _input.data[0] !== "object")
              _input.data = [_input.data];
          }
          return serialize(_input.fields || [], _input.data || [], _skipEmptyLines);
        }
        throw new Error("Unable to serialize unrecognized input");
        function unpackConfig() {
          if (typeof _config !== "object")
            return;
          if (typeof _config.delimiter === "string" && !Papa2.BAD_DELIMITERS.filter(function(value) {
            return _config.delimiter.indexOf(value) !== -1;
          }).length) {
            _delimiter = _config.delimiter;
          }
          if (typeof _config.quotes === "boolean" || typeof _config.quotes === "function" || Array.isArray(_config.quotes))
            _quotes = _config.quotes;
          if (typeof _config.skipEmptyLines === "boolean" || typeof _config.skipEmptyLines === "string")
            _skipEmptyLines = _config.skipEmptyLines;
          if (typeof _config.newline === "string")
            _newline = _config.newline;
          if (typeof _config.quoteChar === "string") {
            _quoteChar = _config.quoteChar;
            _escapedQuote = _quoteChar + _quoteChar;
          }
          if (typeof _config.header === "boolean")
            _writeHeader = _config.header;
          if (Array.isArray(_config.columns)) {
            if (_config.columns.length === 0) throw new Error("Option columns is empty");
            _columns = _config.columns;
          }
          if (_config.escapeChar !== void 0) {
            _escapedQuote = _config.escapeChar + _quoteChar;
          }
          if (_config.escapeFormulae instanceof RegExp) {
            _escapeFormulae = _config.escapeFormulae;
          } else if (typeof _config.escapeFormulae === "boolean" && _config.escapeFormulae) {
            _escapeFormulae = /^[=+\-@\t\r].*$/;
          }
        }
        function serialize(fields, data, skipEmptyLines) {
          var csv = "";
          if (typeof fields === "string")
            fields = JSON.parse(fields);
          if (typeof data === "string")
            data = JSON.parse(data);
          var hasHeader = Array.isArray(fields) && fields.length > 0;
          var dataKeyedByField = !Array.isArray(data[0]);
          if (hasHeader && _writeHeader) {
            for (var i = 0; i < fields.length; i++) {
              if (i > 0)
                csv += _delimiter;
              csv += safe(fields[i], i);
            }
            if (data.length > 0)
              csv += _newline;
          }
          for (var row = 0; row < data.length; row++) {
            var maxCol = hasHeader ? fields.length : data[row].length;
            var emptyLine = false;
            var nullLine = hasHeader ? Object.keys(data[row]).length === 0 : data[row].length === 0;
            if (skipEmptyLines && !hasHeader) {
              emptyLine = skipEmptyLines === "greedy" ? data[row].join("").trim() === "" : data[row].length === 1 && data[row][0].length === 0;
            }
            if (skipEmptyLines === "greedy" && hasHeader) {
              var line = [];
              for (var c = 0; c < maxCol; c++) {
                var cx = dataKeyedByField ? fields[c] : c;
                line.push(data[row][cx]);
              }
              emptyLine = line.join("").trim() === "";
            }
            if (!emptyLine) {
              for (var col = 0; col < maxCol; col++) {
                if (col > 0 && !nullLine)
                  csv += _delimiter;
                var colIdx = hasHeader && dataKeyedByField ? fields[col] : col;
                csv += safe(data[row][colIdx], col);
              }
              if (row < data.length - 1 && (!skipEmptyLines || maxCol > 0 && !nullLine)) {
                csv += _newline;
              }
            }
          }
          return csv;
        }
        function safe(str, col) {
          if (typeof str === "undefined" || str === null)
            return "";
          if (str.constructor === Date)
            return JSON.stringify(str).slice(1, 25);
          var needsQuotes = false;
          if (_escapeFormulae && typeof str === "string" && _escapeFormulae.test(str)) {
            str = "'" + str;
            needsQuotes = true;
          }
          var strValue = str.toString();
          var escapedQuoteStr = strValue.replace(quoteCharRegex, _escapedQuote);
          needsQuotes = needsQuotes || _quotes === true || typeof _quotes === "function" && _quotes(str, col) || Array.isArray(_quotes) && _quotes[col] || hasAny(escapedQuoteStr, Papa2.BAD_DELIMITERS) || escapedQuoteStr.indexOf(_delimiter) > -1 || strValue.indexOf(_quoteChar) > -1 || escapedQuoteStr.charAt(0) === " " || escapedQuoteStr.charAt(escapedQuoteStr.length - 1) === " ";
          return needsQuotes ? _quoteChar + escapedQuoteStr + _quoteChar : escapedQuoteStr;
        }
        function hasAny(str, substrings) {
          for (var i = 0; i < substrings.length; i++)
            if (str.indexOf(substrings[i]) > -1)
              return true;
          return false;
        }
      }
      function ChunkStreamer(config) {
        this._handle = null;
        this._finished = false;
        this._completed = false;
        this._halted = false;
        this._input = null;
        this._baseIndex = 0;
        this._partialLine = "";
        this._rowCount = 0;
        this._start = 0;
        this._nextChunk = null;
        this.isFirstChunk = true;
        this._completeResults = {
          data: [],
          errors: [],
          meta: {}
        };
        replaceConfig.call(this, config);
        this.parseChunk = function(chunk, isFakeChunk) {
          const skipFirstNLines = parseInt(this._config.skipFirstNLines) || 0;
          if (this.isFirstChunk && skipFirstNLines > 0) {
            let _newline = this._config.newline;
            if (!_newline) {
              const quoteChar = this._config.quoteChar || '"';
              _newline = this._handle.guessLineEndings(chunk, quoteChar);
            }
            const splitChunk = chunk.split(_newline);
            chunk = [...splitChunk.slice(skipFirstNLines)].join(_newline);
          }
          if (this.isFirstChunk && isFunction(this._config.beforeFirstChunk)) {
            var modifiedChunk = this._config.beforeFirstChunk(chunk);
            if (modifiedChunk !== void 0)
              chunk = modifiedChunk;
          }
          this.isFirstChunk = false;
          this._halted = false;
          var aggregate = this._partialLine + chunk;
          this._partialLine = "";
          var results = this._handle.parse(aggregate, this._baseIndex, !this._finished);
          if (this._handle.paused() || this._handle.aborted()) {
            this._halted = true;
            return;
          }
          var lastIndex = results.meta.cursor;
          if (!this._finished) {
            this._partialLine = aggregate.substring(lastIndex - this._baseIndex);
            this._baseIndex = lastIndex;
          }
          if (results && results.data)
            this._rowCount += results.data.length;
          var finishedIncludingPreview = this._finished || this._config.preview && this._rowCount >= this._config.preview;
          if (IS_PAPA_WORKER) {
            global.postMessage({
              results,
              workerId: Papa2.WORKER_ID,
              finished: finishedIncludingPreview
            });
          } else if (isFunction(this._config.chunk) && !isFakeChunk) {
            this._config.chunk(results, this._handle);
            if (this._handle.paused() || this._handle.aborted()) {
              this._halted = true;
              return;
            }
            results = void 0;
            this._completeResults = void 0;
          }
          if (!this._config.step && !this._config.chunk) {
            this._completeResults.data = this._completeResults.data.concat(results.data);
            this._completeResults.errors = this._completeResults.errors.concat(results.errors);
            this._completeResults.meta = results.meta;
          }
          if (!this._completed && finishedIncludingPreview && isFunction(this._config.complete) && (!results || !results.meta.aborted)) {
            this._config.complete(this._completeResults, this._input);
            this._completed = true;
          }
          if (!finishedIncludingPreview && (!results || !results.meta.paused))
            this._nextChunk();
          return results;
        };
        this._sendError = function(error) {
          if (isFunction(this._config.error))
            this._config.error(error);
          else if (IS_PAPA_WORKER && this._config.error) {
            global.postMessage({
              workerId: Papa2.WORKER_ID,
              error,
              finished: false
            });
          }
        };
        function replaceConfig(config2) {
          var configCopy = copy(config2);
          configCopy.chunkSize = parseInt(configCopy.chunkSize);
          if (!config2.step && !config2.chunk)
            configCopy.chunkSize = null;
          this._handle = new ParserHandle(configCopy);
          this._handle.streamer = this;
          this._config = configCopy;
        }
      }
      function NetworkStreamer(config) {
        config = config || {};
        if (!config.chunkSize)
          config.chunkSize = Papa2.RemoteChunkSize;
        ChunkStreamer.call(this, config);
        var xhr;
        if (IS_WORKER) {
          this._nextChunk = function() {
            this._readChunk();
            this._chunkLoaded();
          };
        } else {
          this._nextChunk = function() {
            this._readChunk();
          };
        }
        this.stream = function(url) {
          this._input = url;
          this._nextChunk();
        };
        this._readChunk = function() {
          if (this._finished) {
            this._chunkLoaded();
            return;
          }
          xhr = new XMLHttpRequest();
          if (this._config.withCredentials) {
            xhr.withCredentials = this._config.withCredentials;
          }
          if (!IS_WORKER) {
            xhr.onload = bindFunction(this._chunkLoaded, this);
            xhr.onerror = bindFunction(this._chunkError, this);
          }
          xhr.open(this._config.downloadRequestBody ? "POST" : "GET", this._input, !IS_WORKER);
          if (this._config.downloadRequestHeaders) {
            var headers = this._config.downloadRequestHeaders;
            for (var headerName in headers) {
              xhr.setRequestHeader(headerName, headers[headerName]);
            }
          }
          if (this._config.chunkSize) {
            var end = this._start + this._config.chunkSize - 1;
            xhr.setRequestHeader("Range", "bytes=" + this._start + "-" + end);
          }
          try {
            xhr.send(this._config.downloadRequestBody);
          } catch (err2) {
            this._chunkError(err2.message);
          }
          if (IS_WORKER && xhr.status === 0)
            this._chunkError();
        };
        this._chunkLoaded = function() {
          if (xhr.readyState !== 4)
            return;
          if (xhr.status < 200 || xhr.status >= 400) {
            this._chunkError();
            return;
          }
          this._start += this._config.chunkSize ? this._config.chunkSize : xhr.responseText.length;
          this._finished = !this._config.chunkSize || this._start >= getFileSize(xhr);
          this.parseChunk(xhr.responseText);
        };
        this._chunkError = function(errorMessage) {
          var errorText = xhr.statusText || errorMessage;
          this._sendError(new Error(errorText));
        };
        function getFileSize(xhr2) {
          var contentRange = xhr2.getResponseHeader("Content-Range");
          if (contentRange === null) {
            return -1;
          }
          return parseInt(contentRange.substring(contentRange.lastIndexOf("/") + 1));
        }
      }
      NetworkStreamer.prototype = Object.create(ChunkStreamer.prototype);
      NetworkStreamer.prototype.constructor = NetworkStreamer;
      function FileStreamer(config) {
        config = config || {};
        if (!config.chunkSize)
          config.chunkSize = Papa2.LocalChunkSize;
        ChunkStreamer.call(this, config);
        var reader, slice;
        var usingAsyncReader = typeof FileReader !== "undefined";
        this.stream = function(file) {
          this._input = file;
          slice = file.slice || file.webkitSlice || file.mozSlice;
          if (usingAsyncReader) {
            reader = new FileReader();
            reader.onload = bindFunction(this._chunkLoaded, this);
            reader.onerror = bindFunction(this._chunkError, this);
          } else
            reader = new FileReaderSync();
          this._nextChunk();
        };
        this._nextChunk = function() {
          if (!this._finished && (!this._config.preview || this._rowCount < this._config.preview))
            this._readChunk();
        };
        this._readChunk = function() {
          var input = this._input;
          if (this._config.chunkSize) {
            var end = Math.min(this._start + this._config.chunkSize, this._input.size);
            input = slice.call(input, this._start, end);
          }
          var txt = reader.readAsText(input, this._config.encoding);
          if (!usingAsyncReader)
            this._chunkLoaded({ target: { result: txt } });
        };
        this._chunkLoaded = function(event) {
          this._start += this._config.chunkSize;
          this._finished = !this._config.chunkSize || this._start >= this._input.size;
          this.parseChunk(event.target.result);
        };
        this._chunkError = function() {
          this._sendError(reader.error);
        };
      }
      FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
      FileStreamer.prototype.constructor = FileStreamer;
      function StringStreamer(config) {
        config = config || {};
        ChunkStreamer.call(this, config);
        var remaining;
        this.stream = function(s) {
          remaining = s;
          return this._nextChunk();
        };
        this._nextChunk = function() {
          if (this._finished) return;
          var size = this._config.chunkSize;
          var chunk;
          if (size) {
            chunk = remaining.substring(0, size);
            remaining = remaining.substring(size);
          } else {
            chunk = remaining;
            remaining = "";
          }
          this._finished = !remaining;
          return this.parseChunk(chunk);
        };
      }
      StringStreamer.prototype = Object.create(StringStreamer.prototype);
      StringStreamer.prototype.constructor = StringStreamer;
      function ReadableStreamStreamer(config) {
        config = config || {};
        ChunkStreamer.call(this, config);
        var queue = [];
        var parseOnData = true;
        var streamHasEnded = false;
        this.pause = function() {
          ChunkStreamer.prototype.pause.apply(this, arguments);
          this._input.pause();
        };
        this.resume = function() {
          ChunkStreamer.prototype.resume.apply(this, arguments);
          this._input.resume();
        };
        this.stream = function(stream) {
          this._input = stream;
          this._input.on("data", this._streamData);
          this._input.on("end", this._streamEnd);
          this._input.on("error", this._streamError);
        };
        this._checkIsFinished = function() {
          if (streamHasEnded && queue.length === 1) {
            this._finished = true;
          }
        };
        this._nextChunk = function() {
          this._checkIsFinished();
          if (queue.length) {
            this.parseChunk(queue.shift());
          } else {
            parseOnData = true;
          }
        };
        this._streamData = bindFunction(function(chunk) {
          try {
            queue.push(typeof chunk === "string" ? chunk : chunk.toString(this._config.encoding));
            if (parseOnData) {
              parseOnData = false;
              this._checkIsFinished();
              this.parseChunk(queue.shift());
            }
          } catch (error) {
            this._streamError(error);
          }
        }, this);
        this._streamError = bindFunction(function(error) {
          this._streamCleanUp();
          this._sendError(error);
        }, this);
        this._streamEnd = bindFunction(function() {
          this._streamCleanUp();
          streamHasEnded = true;
          this._streamData("");
        }, this);
        this._streamCleanUp = bindFunction(function() {
          this._input.removeListener("data", this._streamData);
          this._input.removeListener("end", this._streamEnd);
          this._input.removeListener("error", this._streamError);
        }, this);
      }
      ReadableStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
      ReadableStreamStreamer.prototype.constructor = ReadableStreamStreamer;
      function DuplexStreamStreamer(_config) {
        var Duplex = __require("stream").Duplex;
        var config = copy(_config);
        var parseOnWrite = true;
        var writeStreamHasFinished = false;
        var parseCallbackQueue = [];
        var stream = null;
        this._onCsvData = function(results) {
          var data = results.data;
          if (!stream.push(data) && !this._handle.paused()) {
            this._handle.pause();
          }
        };
        this._onCsvComplete = function() {
          stream.push(null);
        };
        config.step = bindFunction(this._onCsvData, this);
        config.complete = bindFunction(this._onCsvComplete, this);
        ChunkStreamer.call(this, config);
        this._nextChunk = function() {
          if (writeStreamHasFinished && parseCallbackQueue.length === 1) {
            this._finished = true;
          }
          if (parseCallbackQueue.length) {
            parseCallbackQueue.shift()();
          } else {
            parseOnWrite = true;
          }
        };
        this._addToParseQueue = function(chunk, callback) {
          parseCallbackQueue.push(bindFunction(function() {
            this.parseChunk(typeof chunk === "string" ? chunk : chunk.toString(config.encoding));
            if (isFunction(callback)) {
              return callback();
            }
          }, this));
          if (parseOnWrite) {
            parseOnWrite = false;
            this._nextChunk();
          }
        };
        this._onRead = function() {
          if (this._handle.paused()) {
            this._handle.resume();
          }
        };
        this._onWrite = function(chunk, encoding, callback) {
          this._addToParseQueue(chunk, callback);
        };
        this._onWriteComplete = function() {
          writeStreamHasFinished = true;
          this._addToParseQueue("");
        };
        this.getStream = function() {
          return stream;
        };
        stream = new Duplex({
          readableObjectMode: true,
          decodeStrings: false,
          read: bindFunction(this._onRead, this),
          write: bindFunction(this._onWrite, this)
        });
        stream.once("finish", bindFunction(this._onWriteComplete, this));
      }
      if (typeof PAPA_BROWSER_CONTEXT === "undefined") {
        DuplexStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
        DuplexStreamStreamer.prototype.constructor = DuplexStreamStreamer;
      }
      function ParserHandle(_config) {
        var MAX_FLOAT = Math.pow(2, 53);
        var MIN_FLOAT = -MAX_FLOAT;
        var FLOAT = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/;
        var ISO_DATE = /^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/;
        var self2 = this;
        var _stepCounter = 0;
        var _rowCounter = 0;
        var _input;
        var _parser;
        var _paused = false;
        var _aborted = false;
        var _delimiterError;
        var _fields = [];
        var _results = {
          // The last results returned from the parser
          data: [],
          errors: [],
          meta: {}
        };
        if (isFunction(_config.step)) {
          var userStep = _config.step;
          _config.step = function(results) {
            _results = results;
            if (needsHeaderRow())
              processResults();
            else {
              processResults();
              if (_results.data.length === 0)
                return;
              _stepCounter += results.data.length;
              if (_config.preview && _stepCounter > _config.preview)
                _parser.abort();
              else {
                _results.data = _results.data[0];
                userStep(_results, self2);
              }
            }
          };
        }
        this.parse = function(input, baseIndex, ignoreLastRow) {
          var quoteChar = _config.quoteChar || '"';
          if (!_config.newline)
            _config.newline = this.guessLineEndings(input, quoteChar);
          _delimiterError = false;
          if (!_config.delimiter) {
            var delimGuess = guessDelimiter(input, _config.newline, _config.skipEmptyLines, _config.comments, _config.delimitersToGuess);
            if (delimGuess.successful)
              _config.delimiter = delimGuess.bestDelimiter;
            else {
              _delimiterError = true;
              _config.delimiter = Papa2.DefaultDelimiter;
            }
            _results.meta.delimiter = _config.delimiter;
          } else if (isFunction(_config.delimiter)) {
            _config.delimiter = _config.delimiter(input);
            _results.meta.delimiter = _config.delimiter;
          }
          var parserConfig = copy(_config);
          if (_config.preview && _config.header)
            parserConfig.preview++;
          _input = input;
          _parser = new Parser(parserConfig);
          _results = _parser.parse(_input, baseIndex, ignoreLastRow);
          processResults();
          return _paused ? { meta: { paused: true } } : _results || { meta: { paused: false } };
        };
        this.paused = function() {
          return _paused;
        };
        this.pause = function() {
          _paused = true;
          _parser.abort();
          _input = isFunction(_config.chunk) ? "" : _input.substring(_parser.getCharIndex());
        };
        this.resume = function() {
          if (self2.streamer._halted) {
            _paused = false;
            self2.streamer.parseChunk(_input, true);
          } else {
            setTimeout(self2.resume, 3);
          }
        };
        this.aborted = function() {
          return _aborted;
        };
        this.abort = function() {
          _aborted = true;
          _parser.abort();
          _results.meta.aborted = true;
          if (isFunction(_config.complete))
            _config.complete(_results);
          _input = "";
        };
        this.guessLineEndings = function(input, quoteChar) {
          input = input.substring(0, 1024 * 1024);
          var re = new RegExp(escapeRegExp(quoteChar) + "([^]*?)" + escapeRegExp(quoteChar), "gm");
          input = input.replace(re, "");
          var r = input.split("\r");
          var n = input.split("\n");
          var nAppearsFirst = n.length > 1 && n[0].length < r[0].length;
          if (r.length === 1 || nAppearsFirst)
            return "\n";
          var numWithN = 0;
          for (var i = 0; i < r.length; i++) {
            if (r[i][0] === "\n")
              numWithN++;
          }
          return numWithN >= r.length / 2 ? "\r\n" : "\r";
        };
        function testEmptyLine(s) {
          return _config.skipEmptyLines === "greedy" ? s.join("").trim() === "" : s.length === 1 && s[0].length === 0;
        }
        function testFloat(s) {
          if (FLOAT.test(s)) {
            var floatValue = parseFloat(s);
            if (floatValue > MIN_FLOAT && floatValue < MAX_FLOAT) {
              return true;
            }
          }
          return false;
        }
        function processResults() {
          if (_results && _delimiterError) {
            addError("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '" + Papa2.DefaultDelimiter + "'");
            _delimiterError = false;
          }
          if (_config.skipEmptyLines) {
            _results.data = _results.data.filter(function(d) {
              return !testEmptyLine(d);
            });
          }
          if (needsHeaderRow())
            fillHeaderFields();
          return applyHeaderAndDynamicTypingAndTransformation();
        }
        function needsHeaderRow() {
          return _config.header && _fields.length === 0;
        }
        function fillHeaderFields() {
          if (!_results)
            return;
          function addHeader(header, i2) {
            header = stripBom(header);
            if (isFunction(_config.transformHeader))
              header = _config.transformHeader(header, i2);
            _fields.push(header);
          }
          if (Array.isArray(_results.data[0])) {
            for (var i = 0; needsHeaderRow() && i < _results.data.length; i++)
              _results.data[i].forEach(addHeader);
            _results.data.splice(0, 1);
          } else
            _results.data.forEach(addHeader);
        }
        function shouldApplyDynamicTyping(field) {
          if (_config.dynamicTypingFunction && _config.dynamicTyping[field] === void 0) {
            _config.dynamicTyping[field] = _config.dynamicTypingFunction(field);
          }
          return (_config.dynamicTyping[field] || _config.dynamicTyping) === true;
        }
        function parseDynamic(field, value) {
          if (shouldApplyDynamicTyping(field)) {
            if (value === "true" || value === "TRUE")
              return true;
            else if (value === "false" || value === "FALSE")
              return false;
            else if (testFloat(value))
              return parseFloat(value);
            else if (ISO_DATE.test(value))
              return new Date(value);
            else
              return value === "" ? null : value;
          }
          return value;
        }
        function applyHeaderAndDynamicTypingAndTransformation() {
          if (!_results || !_config.header && !_config.dynamicTyping && !_config.transform)
            return _results;
          function processRow(rowSource, i) {
            var row = _config.header ? {} : [];
            var j;
            for (j = 0; j < rowSource.length; j++) {
              var field = j;
              var value = rowSource[j];
              if (_config.header)
                field = j >= _fields.length ? "__parsed_extra" : _fields[j];
              if (_config.transform)
                value = _config.transform(value, field);
              value = parseDynamic(field, value);
              if (field === "__parsed_extra") {
                row[field] = row[field] || [];
                row[field].push(value);
              } else
                row[field] = value;
            }
            if (_config.header) {
              if (j > _fields.length)
                addError("FieldMismatch", "TooManyFields", "Too many fields: expected " + _fields.length + " fields but parsed " + j, _rowCounter + i);
              else if (j < _fields.length)
                addError("FieldMismatch", "TooFewFields", "Too few fields: expected " + _fields.length + " fields but parsed " + j, _rowCounter + i);
            }
            return row;
          }
          var incrementBy = 1;
          if (!_results.data.length || Array.isArray(_results.data[0])) {
            _results.data = _results.data.map(processRow);
            incrementBy = _results.data.length;
          } else
            _results.data = processRow(_results.data, 0);
          if (_config.header && _results.meta)
            _results.meta.fields = _fields;
          _rowCounter += incrementBy;
          return _results;
        }
        function guessDelimiter(input, newline, skipEmptyLines, comments, delimitersToGuess) {
          var bestDelim, bestDelta, fieldCountPrevRow, maxFieldCount;
          delimitersToGuess = delimitersToGuess || [",", "	", "|", ";", Papa2.RECORD_SEP, Papa2.UNIT_SEP];
          for (var i = 0; i < delimitersToGuess.length; i++) {
            var delim = delimitersToGuess[i];
            var delta = 0, avgFieldCount = 0, emptyLinesCount = 0;
            fieldCountPrevRow = void 0;
            var preview = new Parser({
              comments,
              delimiter: delim,
              newline,
              preview: 10
            }).parse(input);
            for (var j = 0; j < preview.data.length; j++) {
              if (skipEmptyLines && testEmptyLine(preview.data[j])) {
                emptyLinesCount++;
                continue;
              }
              var fieldCount = preview.data[j].length;
              avgFieldCount += fieldCount;
              if (typeof fieldCountPrevRow === "undefined") {
                fieldCountPrevRow = fieldCount;
                continue;
              } else if (fieldCount > 0) {
                delta += Math.abs(fieldCount - fieldCountPrevRow);
                fieldCountPrevRow = fieldCount;
              }
            }
            if (preview.data.length > 0)
              avgFieldCount /= preview.data.length - emptyLinesCount;
            if ((typeof bestDelta === "undefined" || delta <= bestDelta) && (typeof maxFieldCount === "undefined" || avgFieldCount > maxFieldCount) && avgFieldCount > 1.99) {
              bestDelta = delta;
              bestDelim = delim;
              maxFieldCount = avgFieldCount;
            }
          }
          _config.delimiter = bestDelim;
          return {
            successful: !!bestDelim,
            bestDelimiter: bestDelim
          };
        }
        function addError(type, code, msg, row) {
          var error = {
            type,
            code,
            message: msg
          };
          if (row !== void 0) {
            error.row = row;
          }
          _results.errors.push(error);
        }
      }
      function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      function Parser(config) {
        config = config || {};
        var delim = config.delimiter;
        var newline = config.newline;
        var comments = config.comments;
        var step = config.step;
        var preview = config.preview;
        var fastMode = config.fastMode;
        var quoteChar;
        var renamedHeaders = null;
        var headerParsed = false;
        if (config.quoteChar === void 0 || config.quoteChar === null) {
          quoteChar = '"';
        } else {
          quoteChar = config.quoteChar;
        }
        var escapeChar = quoteChar;
        if (config.escapeChar !== void 0) {
          escapeChar = config.escapeChar;
        }
        if (typeof delim !== "string" || Papa2.BAD_DELIMITERS.indexOf(delim) > -1)
          delim = ",";
        if (comments === delim)
          throw new Error("Comment character same as delimiter");
        else if (comments === true)
          comments = "#";
        else if (typeof comments !== "string" || Papa2.BAD_DELIMITERS.indexOf(comments) > -1)
          comments = false;
        if (newline !== "\n" && newline !== "\r" && newline !== "\r\n")
          newline = "\n";
        var cursor = 0;
        var aborted = false;
        this.parse = function(input, baseIndex, ignoreLastRow) {
          if (typeof input !== "string")
            throw new Error("Input must be a string");
          var inputLen = input.length, delimLen = delim.length, newlineLen = newline.length, commentsLen = comments.length;
          var stepIsFunction = isFunction(step);
          cursor = 0;
          var data = [], errors = [], row = [], lastCursor = 0;
          if (!input)
            return returnable();
          if (fastMode || fastMode !== false && input.indexOf(quoteChar) === -1) {
            var rows = input.split(newline);
            for (var i = 0; i < rows.length; i++) {
              row = rows[i];
              cursor += row.length;
              if (i !== rows.length - 1)
                cursor += newline.length;
              else if (ignoreLastRow)
                return returnable();
              if (comments && row.substring(0, commentsLen) === comments)
                continue;
              if (stepIsFunction) {
                data = [];
                pushRow(row.split(delim));
                doStep();
                if (aborted)
                  return returnable();
              } else
                pushRow(row.split(delim));
              if (preview && i >= preview) {
                data = data.slice(0, preview);
                return returnable(true);
              }
            }
            return returnable();
          }
          var nextDelim = input.indexOf(delim, cursor);
          var nextNewline = input.indexOf(newline, cursor);
          var quoteCharRegex = new RegExp(escapeRegExp(escapeChar) + escapeRegExp(quoteChar), "g");
          var quoteSearch = input.indexOf(quoteChar, cursor);
          for (; ; ) {
            if (input[cursor] === quoteChar) {
              quoteSearch = cursor;
              cursor++;
              for (; ; ) {
                quoteSearch = input.indexOf(quoteChar, quoteSearch + 1);
                if (quoteSearch === -1) {
                  if (!ignoreLastRow) {
                    errors.push({
                      type: "Quotes",
                      code: "MissingQuotes",
                      message: "Quoted field unterminated",
                      row: data.length,
                      // row has yet to be inserted
                      index: cursor
                    });
                  }
                  return finish();
                }
                if (quoteSearch === inputLen - 1) {
                  var value = input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar);
                  return finish(value);
                }
                if (quoteChar === escapeChar && input[quoteSearch + 1] === escapeChar) {
                  quoteSearch++;
                  continue;
                }
                if (quoteChar !== escapeChar && quoteSearch !== 0 && input[quoteSearch - 1] === escapeChar) {
                  continue;
                }
                if (nextDelim !== -1 && nextDelim < quoteSearch + 1) {
                  nextDelim = input.indexOf(delim, quoteSearch + 1);
                }
                if (nextNewline !== -1 && nextNewline < quoteSearch + 1) {
                  nextNewline = input.indexOf(newline, quoteSearch + 1);
                }
                var checkUpTo = nextNewline === -1 ? nextDelim : Math.min(nextDelim, nextNewline);
                var spacesBetweenQuoteAndDelimiter = extraSpaces(checkUpTo);
                if (input.substr(quoteSearch + 1 + spacesBetweenQuoteAndDelimiter, delimLen) === delim) {
                  row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
                  cursor = quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen;
                  if (input[quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen] !== quoteChar) {
                    quoteSearch = input.indexOf(quoteChar, cursor);
                  }
                  nextDelim = input.indexOf(delim, cursor);
                  nextNewline = input.indexOf(newline, cursor);
                  break;
                }
                var spacesBetweenQuoteAndNewLine = extraSpaces(nextNewline);
                if (input.substring(quoteSearch + 1 + spacesBetweenQuoteAndNewLine, quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen) === newline) {
                  row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
                  saveRow(quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen);
                  nextDelim = input.indexOf(delim, cursor);
                  quoteSearch = input.indexOf(quoteChar, cursor);
                  if (stepIsFunction) {
                    doStep();
                    if (aborted)
                      return returnable();
                  }
                  if (preview && data.length >= preview)
                    return returnable(true);
                  break;
                }
                errors.push({
                  type: "Quotes",
                  code: "InvalidQuotes",
                  message: "Trailing quote on quoted field is malformed",
                  row: data.length,
                  // row has yet to be inserted
                  index: cursor
                });
                quoteSearch++;
                continue;
              }
              continue;
            }
            if (comments && row.length === 0 && input.substring(cursor, cursor + commentsLen) === comments) {
              if (nextNewline === -1)
                return returnable();
              cursor = nextNewline + newlineLen;
              nextNewline = input.indexOf(newline, cursor);
              nextDelim = input.indexOf(delim, cursor);
              continue;
            }
            if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1)) {
              row.push(input.substring(cursor, nextDelim));
              cursor = nextDelim + delimLen;
              nextDelim = input.indexOf(delim, cursor);
              continue;
            }
            if (nextNewline !== -1) {
              row.push(input.substring(cursor, nextNewline));
              saveRow(nextNewline + newlineLen);
              if (stepIsFunction) {
                doStep();
                if (aborted)
                  return returnable();
              }
              if (preview && data.length >= preview)
                return returnable(true);
              continue;
            }
            break;
          }
          return finish();
          function pushRow(row2) {
            data.push(row2);
            lastCursor = cursor;
          }
          function extraSpaces(index) {
            var spaceLength = 0;
            if (index !== -1) {
              var textBetweenClosingQuoteAndIndex = input.substring(quoteSearch + 1, index);
              if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === "") {
                spaceLength = textBetweenClosingQuoteAndIndex.length;
              }
            }
            return spaceLength;
          }
          function finish(value2) {
            if (ignoreLastRow)
              return returnable();
            if (typeof value2 === "undefined")
              value2 = input.substring(cursor);
            row.push(value2);
            cursor = inputLen;
            pushRow(row);
            if (stepIsFunction)
              doStep();
            return returnable();
          }
          function saveRow(newCursor) {
            cursor = newCursor;
            pushRow(row);
            row = [];
            nextNewline = input.indexOf(newline, cursor);
          }
          function returnable(stopped) {
            if (config.header && !baseIndex && data.length && !headerParsed) {
              const result = data[0];
              const headerCount = /* @__PURE__ */ Object.create(null);
              const usedHeaders = new Set(result);
              let duplicateHeaders = false;
              for (let i2 = 0; i2 < result.length; i2++) {
                let header = stripBom(result[i2]);
                if (isFunction(config.transformHeader))
                  header = config.transformHeader(header, i2);
                if (!headerCount[header]) {
                  headerCount[header] = 1;
                  result[i2] = header;
                } else {
                  let newHeader;
                  let suffixCount = headerCount[header];
                  do {
                    newHeader = `${header}_${suffixCount}`;
                    suffixCount++;
                  } while (usedHeaders.has(newHeader));
                  usedHeaders.add(newHeader);
                  result[i2] = newHeader;
                  headerCount[header]++;
                  duplicateHeaders = true;
                  if (renamedHeaders === null) {
                    renamedHeaders = {};
                  }
                  renamedHeaders[newHeader] = header;
                }
                usedHeaders.add(header);
              }
              if (duplicateHeaders) {
                console.warn("Duplicate headers found and renamed.");
              }
              headerParsed = true;
            }
            return {
              data,
              errors,
              meta: {
                delimiter: delim,
                linebreak: newline,
                aborted,
                truncated: !!stopped,
                cursor: lastCursor + (baseIndex || 0),
                renamedHeaders
              }
            };
          }
          function doStep() {
            step(returnable());
            data = [];
            errors = [];
          }
        };
        this.abort = function() {
          aborted = true;
        };
        this.getCharIndex = function() {
          return cursor;
        };
      }
      function newWorker() {
        if (!Papa2.WORKERS_SUPPORTED)
          return false;
        var workerUrl = getWorkerBlob();
        var w = new global.Worker(workerUrl);
        w.onmessage = mainThreadReceivedMessage;
        w.id = workerIdCounter++;
        workers[w.id] = w;
        return w;
      }
      function mainThreadReceivedMessage(e) {
        var msg = e.data;
        var worker = workers[msg.workerId];
        var aborted = false;
        if (msg.error)
          worker.userError(msg.error, msg.file);
        else if (msg.results && msg.results.data) {
          var abort = function() {
            aborted = true;
            completeWorker(msg.workerId, { data: [], errors: [], meta: { aborted: true } });
          };
          var handle = {
            abort,
            pause: notImplemented,
            resume: notImplemented
          };
          if (isFunction(worker.userStep)) {
            for (var i = 0; i < msg.results.data.length; i++) {
              worker.userStep({
                data: msg.results.data[i],
                errors: msg.results.errors,
                meta: msg.results.meta
              }, handle);
              if (aborted)
                break;
            }
            delete msg.results;
          } else if (isFunction(worker.userChunk)) {
            worker.userChunk(msg.results, handle, msg.file);
            delete msg.results;
          }
        }
        if (msg.finished && !aborted)
          completeWorker(msg.workerId, msg.results);
      }
      function completeWorker(workerId, results) {
        var worker = workers[workerId];
        if (isFunction(worker.userComplete))
          worker.userComplete(results);
        worker.terminate();
        delete workers[workerId];
      }
      function notImplemented() {
        throw new Error("Not implemented.");
      }
      function workerThreadReceivedMessage(e) {
        var msg = e.data;
        if (typeof Papa2.WORKER_ID === "undefined" && msg)
          Papa2.WORKER_ID = msg.workerId;
        if (typeof msg.input === "string") {
          global.postMessage({
            workerId: Papa2.WORKER_ID,
            results: Papa2.parse(msg.input, msg.config),
            finished: true
          });
        } else if (global.File && msg.input instanceof File || msg.input instanceof Object) {
          var results = Papa2.parse(msg.input, msg.config);
          if (results)
            global.postMessage({
              workerId: Papa2.WORKER_ID,
              results,
              finished: true
            });
        }
      }
      function copy(obj) {
        if (typeof obj !== "object" || obj === null)
          return obj;
        var cpy = Array.isArray(obj) ? [] : {};
        for (var key in obj)
          cpy[key] = copy(obj[key]);
        return cpy;
      }
      function bindFunction(f, self2) {
        return function() {
          f.apply(self2, arguments);
        };
      }
      function isFunction(func) {
        return typeof func === "function";
      }
      return Papa2;
    });
  }
});

// src/cli.ts
import { writeFile } from "node:fs/promises";
import { basename as basename2, extname, resolve as resolve2 } from "node:path";

// src/analyze.ts
var INT_RE = /^[+-]?\d+$/;
var NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
var DATETIME_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
function isNullish(v) {
  return v === null || v === void 0 || typeof v === "string" && (v.trim() === "" || v.trim().toLowerCase() === "null" || v.trim().toLowerCase() === "na" || v.trim().toLowerCase() === "nan");
}
function inferType(values) {
  let n = 0;
  let ints = 0;
  let nums = 0;
  let bools = 0;
  let dates = 0;
  let datetimes = 0;
  for (const raw of values) {
    if (isNullish(raw)) continue;
    n++;
    if (typeof raw === "boolean") {
      bools++;
      continue;
    }
    if (typeof raw === "number") {
      nums++;
      if (Number.isInteger(raw)) ints++;
      continue;
    }
    const v = String(raw).trim();
    const low = v.toLowerCase();
    if (low === "true" || low === "false") {
      bools++;
      continue;
    }
    if (INT_RE.test(v)) {
      ints++;
      nums++;
      continue;
    }
    if (NUM_RE.test(v)) {
      nums++;
      continue;
    }
    if (DATETIME_RE.test(v)) {
      datetimes++;
      continue;
    }
    if (DATE_RE.test(v)) {
      dates++;
      continue;
    }
  }
  if (n === 0) return "string";
  const frac = (x) => x / n;
  if (frac(bools) >= 0.99) return "boolean";
  if (frac(datetimes) >= 0.95) return "datetime";
  if (frac(dates) >= 0.95) return "date";
  if (frac(ints) >= 0.95) return "integer";
  if (frac(nums) >= 0.95) return "number";
  return "string";
}
function coerce(raw, type) {
  if (isNullish(raw)) return null;
  switch (type) {
    case "integer":
    case "number": {
      if (typeof raw === "number") return raw;
      const n = Number(String(raw).trim());
      return Number.isNaN(n) ? null : n;
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      const low = String(raw).trim().toLowerCase();
      if (low === "true") return true;
      if (low === "false") return false;
      return null;
    }
    case "date":
    case "datetime": {
      if (raw instanceof Date) return raw.getTime();
      if (typeof raw === "number") return raw;
      const t = Date.parse(String(raw).trim());
      return Number.isNaN(t) ? null : t;
    }
    default:
      return typeof raw === "string" ? raw : String(raw);
  }
}
function quantile(sorted, q) {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base2 = Math.floor(pos);
  const rest = pos - base2;
  if (sorted[base2 + 1] !== void 0) {
    return sorted[base2] + rest * (sorted[base2 + 1] - sorted[base2]);
  }
  return sorted[base2];
}
function fmtDate(ms, withTime) {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  const iso = d.toISOString();
  return withTime ? iso.replace("T", " ").replace(".000Z", "Z") : iso.slice(0, 10);
}
function analyzeColumn(name, type, values) {
  let nulls = 0;
  const present = [];
  for (const v of values) {
    if (v === null || v === void 0) nulls++;
    else present.push(v);
  }
  const count = present.length;
  const uniqueSet = /* @__PURE__ */ new Set();
  for (const v of present) {
    uniqueSet.add(v);
    if (uniqueSet.size > 1e5) break;
  }
  const stats = {
    name,
    type,
    count,
    nulls,
    unique: uniqueSet.size,
    uniqueApprox: uniqueSet.size > 1e5
  };
  if (type === "integer" || type === "number") {
    const nums = present.filter((v) => typeof v === "number");
    if (nums.length) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
      stats.mean = mean;
      stats.median = quantile(sorted, 0.5);
      stats.std = Math.sqrt(variance);
      stats.histogram = buildHistogram(sorted);
    }
  } else if (type === "date" || type === "datetime") {
    const nums = present.filter((v) => typeof v === "number");
    if (nums.length) {
      const sorted = [...nums].sort((a, b) => a - b);
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
      stats.minLabel = fmtDate(sorted[0], type === "datetime");
      stats.maxLabel = fmtDate(sorted[sorted.length - 1], type === "datetime");
      stats.histogram = buildHistogram(sorted);
    }
  } else {
    const counts = /* @__PURE__ */ new Map();
    for (const v of present) {
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    stats.top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([value, count2]) => ({ value, count: count2 }));
  }
  return stats;
}
function buildHistogram(sorted) {
  const min = sorted[0];
  const max2 = sorted[sorted.length - 1];
  if (min === max2) return { bins: [min, max2], counts: [sorted.length] };
  const n = Math.min(30, Math.max(5, Math.ceil(Math.sqrt(sorted.length))));
  const width = (max2 - min) / n;
  const bins = [];
  for (let i = 0; i <= n; i++) bins.push(min + i * width);
  const counts = new Array(n).fill(0);
  for (const v of sorted) {
    let idx = Math.floor((v - min) / width);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return { bins, counts };
}

// src/parse-core.ts
var import_papaparse = __toESM(require_papaparse(), 1);
function extLower(path) {
  const base2 = path.replace(/[?#].*$/, "").split(/[/\\]/).pop() ?? "";
  const dot = base2.lastIndexOf(".");
  return dot > 0 ? base2.slice(dot).toLowerCase() : "";
}
function detectFormat(path, hint) {
  if (hint) return hint;
  switch (extLower(path)) {
    case ".csv":
      return "csv";
    case ".tsv":
    case ".tab":
      return "tsv";
    case ".ndjson":
    case ".jsonl":
      return "ndjson";
    case ".json":
      return "json";
    case ".parquet":
    case ".pq":
      return "parquet";
    case ".xlsx":
    case ".xlsm":
      return "xlsx";
    default:
      return "csv";
  }
}
function parseText(text, format, opts = {}) {
  const limit = opts.limit ?? Infinity;
  switch (format) {
    case "csv":
    case "tsv":
      return parseDelimited(text, format, limit, opts.delimiter);
    case "ndjson":
      return parseNdjson(text, limit);
    case "json":
      return parseJson(text, limit);
    case "parquet":
    case "xlsx":
      throw new Error(`${format} cannot be read from stdin; pass a file path instead`);
    default:
      return parseDelimited(text, "csv", limit);
  }
}
function parseDelimited(text, format, limit, delimiter) {
  const res = import_papaparse.default.parse(text, {
    header: true,
    delimiter: delimiter ?? (format === "tsv" ? "	" : ""),
    skipEmptyLines: "greedy",
    dynamicTyping: false
  });
  let rows = res.data;
  const total = rows.length;
  let truncated = false;
  if (rows.length > limit) {
    rows = rows.slice(0, limit);
    truncated = true;
  }
  return { rows, format, totalRowCount: total, truncated };
}
function parseNdjson(text, limit) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const total = lines.length;
  const rows = [];
  for (const line of lines) {
    if (rows.length >= limit) break;
    try {
      rows.push(JSON.parse(line));
    } catch {
    }
  }
  return { rows, format: "ndjson", totalRowCount: total, truncated: total > rows.length };
}
function parseJson(text, limit) {
  const data = JSON.parse(text);
  let arr;
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === "object") {
    const arrayProp = Object.values(data).find(
      (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object"
    );
    arr = arrayProp ?? [data];
  } else {
    arr = [data];
  }
  const total = arr.length;
  let rows = arr.map((r) => r && typeof r === "object" ? r : { value: r });
  let truncated = false;
  if (rows.length > limit) {
    rows = rows.slice(0, limit);
    truncated = true;
  }
  return { rows, format: "json", totalRowCount: total, truncated };
}

// src/dataset-core.ts
var TYPE_SAMPLE = 5e3;
function datasetFromRows(rows, meta = {}) {
  const columns = [];
  const seen = /* @__PURE__ */ new Set();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        columns.push(k);
      }
    }
  }
  const sample = rows.slice(0, TYPE_SAMPLE);
  const types = {};
  for (const col of columns) {
    types[col] = inferType(sample.map((r) => r[col]));
  }
  const typed = rows.map((r) => {
    const out = {};
    for (const col of columns) out[col] = coerce(r[col], types[col]);
    return out;
  });
  const stats = columns.map(
    (col) => analyzeColumn(
      col,
      types[col],
      typed.map((r) => r[col])
    )
  );
  return {
    columns,
    types,
    rows: typed,
    stats,
    rowCount: typed.length,
    totalRowCount: meta.totalRowCount && meta.totalRowCount > typed.length ? meta.totalRowCount : void 0,
    truncated: meta.truncated ?? false,
    source: meta.source ?? "memory",
    format: meta.format ?? "memory"
  };
}
function buildDatasetFromText(text, format, opts = {}, source = "stdin") {
  const { rows, format: fmt, totalRowCount, truncated } = parseText(text, format, opts);
  return datasetFromRows(rows, { format: fmt, source, totalRowCount, truncated });
}

// src/parse.ts
import { readFile } from "node:fs/promises";

// node_modules/hyparquet/src/node.js
import { createReadStream, promises as fs } from "fs";

// node_modules/hyparquet/src/constants.js
var ParquetTypes = [
  "BOOLEAN",
  "INT32",
  "INT64",
  "INT96",
  // deprecated
  "FLOAT",
  "DOUBLE",
  "BYTE_ARRAY",
  "FIXED_LEN_BYTE_ARRAY"
];
var Encodings = [
  "PLAIN",
  "GROUP_VAR_INT",
  // deprecated
  "PLAIN_DICTIONARY",
  "RLE",
  "BIT_PACKED",
  // deprecated
  "DELTA_BINARY_PACKED",
  "DELTA_LENGTH_BYTE_ARRAY",
  "DELTA_BYTE_ARRAY",
  "RLE_DICTIONARY",
  "BYTE_STREAM_SPLIT"
];
var FieldRepetitionTypes = [
  "REQUIRED",
  "OPTIONAL",
  "REPEATED"
];
var ConvertedTypes = [
  "UTF8",
  "MAP",
  "MAP_KEY_VALUE",
  "LIST",
  "ENUM",
  "DECIMAL",
  "DATE",
  "TIME_MILLIS",
  "TIME_MICROS",
  "TIMESTAMP_MILLIS",
  "TIMESTAMP_MICROS",
  "UINT_8",
  "UINT_16",
  "UINT_32",
  "UINT_64",
  "INT_8",
  "INT_16",
  "INT_32",
  "INT_64",
  "JSON",
  "BSON",
  "INTERVAL"
];
var CompressionCodecs = [
  "UNCOMPRESSED",
  "SNAPPY",
  "GZIP",
  "LZO",
  "BROTLI",
  "LZ4",
  "ZSTD",
  "LZ4_RAW"
];
var PageTypes = [
  "DATA_PAGE",
  "INDEX_PAGE",
  "DICTIONARY_PAGE",
  "DATA_PAGE_V2"
];
var EdgeInterpolationAlgorithms = [
  "SPHERICAL",
  "VINCENTY",
  "THOMAS",
  "ANDOYER",
  "KARNEY"
];

// node_modules/hyparquet/src/wkb.js
function wkbToGeojson(reader) {
  const flags = getFlags(reader);
  if (flags.type === 1) {
    return { type: "Point", coordinates: readPosition(reader, flags) };
  } else if (flags.type === 2) {
    return { type: "LineString", coordinates: readLine(reader, flags) };
  } else if (flags.type === 3) {
    return { type: "Polygon", coordinates: readPolygon(reader, flags) };
  } else if (flags.type === 4) {
    const points = [];
    for (let i = 0; i < flags.count; i++) {
      points.push(readPosition(reader, getFlags(reader)));
    }
    return { type: "MultiPoint", coordinates: points };
  } else if (flags.type === 5) {
    const lines = [];
    for (let i = 0; i < flags.count; i++) {
      lines.push(readLine(reader, getFlags(reader)));
    }
    return { type: "MultiLineString", coordinates: lines };
  } else if (flags.type === 6) {
    const polygons = [];
    for (let i = 0; i < flags.count; i++) {
      polygons.push(readPolygon(reader, getFlags(reader)));
    }
    return { type: "MultiPolygon", coordinates: polygons };
  } else if (flags.type === 7) {
    const geometries = [];
    for (let i = 0; i < flags.count; i++) {
      geometries.push(wkbToGeojson(reader));
    }
    return { type: "GeometryCollection", geometries };
  } else {
    throw new Error(`Unsupported geometry type: ${flags.type}`);
  }
}
function getFlags(reader) {
  const { view } = reader;
  const littleEndian = view.getUint8(reader.offset++) === 1;
  const rawType = view.getUint32(reader.offset, littleEndian);
  reader.offset += 4;
  const type = rawType % 1e3;
  const flags = Math.floor(rawType / 1e3);
  let count = 0;
  if (type > 1 && type <= 7) {
    count = view.getUint32(reader.offset, littleEndian);
    reader.offset += 4;
  }
  let dim = 2;
  if (flags) dim++;
  if (flags === 3) dim++;
  return { littleEndian, type, dim, count };
}
function readPosition(reader, flags) {
  const points = [];
  for (let i = 0; i < flags.dim; i++) {
    const coord = reader.view.getFloat64(reader.offset, flags.littleEndian);
    reader.offset += 8;
    points.push(coord);
  }
  return points;
}
function readLine(reader, flags) {
  const points = [];
  for (let i = 0; i < flags.count; i++) {
    points.push(readPosition(reader, flags));
  }
  return points;
}
function readPolygon(reader, flags) {
  const { view } = reader;
  const rings = [];
  for (let r = 0; r < flags.count; r++) {
    const count = view.getUint32(reader.offset, flags.littleEndian);
    reader.offset += 4;
    rings.push(readLine(reader, { ...flags, count }));
  }
  return rings;
}

// node_modules/hyparquet/src/convert.js
var decoder = new TextDecoder();
var DEFAULT_PARSERS = {
  timestampFromMilliseconds(millis) {
    return new Date(Number(millis));
  },
  timestampFromMicroseconds(micros) {
    return new Date(Number(micros / 1000n));
  },
  timestampFromNanoseconds(nanos) {
    return new Date(Number(nanos / 1000000n));
  },
  dateFromDays(days) {
    return new Date(days * 864e5);
  },
  stringFromBytes(bytes) {
    return bytes && decoder.decode(bytes);
  },
  jsonFromBytes(bytes) {
    return bytes && JSON.parse(decoder.decode(bytes));
  },
  geometryFromBytes(bytes) {
    return bytes && wkbToGeojson({ view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), offset: 0 });
  },
  geographyFromBytes(bytes) {
    return bytes && wkbToGeojson({ view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), offset: 0 });
  },
  uuidFromBytes(bytes) {
    if (!bytes) return void 0;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-" + hex.slice(12, 16) + "-" + hex.slice(16, 20) + "-" + hex.slice(20, 32);
  }
};
function convertWithDictionary(data, dictionary, encoding, columnDecoder) {
  if (dictionary && encoding.endsWith("_DICTIONARY")) {
    let output = data;
    if (data instanceof Uint8Array && !(dictionary instanceof Uint8Array)) {
      output = new dictionary.constructor(data.length);
    }
    for (let i = 0; i < data.length; i++) {
      output[i] = dictionary[data[i]];
    }
    return output;
  } else {
    return convert(data, columnDecoder);
  }
}
function convert(data, columnDecoder) {
  const { element, parsers, utf8 = true, schemaPath } = columnDecoder;
  const { type, converted_type: ctype, logical_type: ltype } = element;
  const nullable = element.repetition_type !== "REQUIRED";
  const isVariant = schemaPath?.some((s) => s.element.logical_type?.type === "VARIANT");
  if (isVariant && type === "BYTE_ARRAY" && ctype !== "UTF8" && ltype?.type !== "STRING") {
    return data;
  }
  if (ctype === "DECIMAL") {
    const scale = element.scale || 0;
    const factor = 10 ** -scale;
    const arr = new Array(data.length);
    for (let i = 0; i < arr.length; i++) {
      if (data[i] instanceof Uint8Array) {
        arr[i] = parseDecimal(data[i]) * factor;
      } else {
        arr[i] = Number(data[i]) * factor;
      }
    }
    return arr;
  }
  if (!ctype && type === "INT96") {
    return Array.from(data).map((v) => parsers.timestampFromNanoseconds(parseInt96Nanos(v)));
  }
  if (ctype === "DATE") {
    return Array.from(data).map((v) => parsers.dateFromDays(v));
  }
  if (ctype === "TIMESTAMP_MILLIS") {
    return Array.from(data).map((v) => parsers.timestampFromMilliseconds(v));
  }
  if (ctype === "TIMESTAMP_MICROS") {
    return Array.from(data).map((v) => parsers.timestampFromMicroseconds(v));
  }
  if (ctype === "JSON") {
    return data.map((v) => parsers.jsonFromBytes(v));
  }
  if (ctype === "BSON") {
    throw new Error("parquet bson not supported");
  }
  if (ctype === "INTERVAL") {
    throw new Error("parquet interval not supported");
  }
  if (ltype?.type === "GEOMETRY") {
    return data.map((v) => parsers.geometryFromBytes(v));
  }
  if (ltype?.type === "GEOGRAPHY") {
    return data.map((v) => parsers.geographyFromBytes(v));
  }
  if (ltype?.type === "UUID") {
    return data.map((v) => parsers.uuidFromBytes(v));
  }
  if (ctype === "UTF8" || ltype?.type === "STRING" || utf8 && type === "BYTE_ARRAY") {
    return data.map((v) => parsers.stringFromBytes(v));
  }
  if (ctype === "UINT_64" || ltype?.type === "INTEGER" && ltype.bitWidth === 64 && !ltype.isSigned) {
    if (data instanceof BigInt64Array) return new BigUint64Array(data.buffer, data.byteOffset, data.length);
    const arr = nullable ? new Array(data.length) : new BigUint64Array(data.length);
    for (let i = 0; i < arr.length; i++) arr[i] = data[i];
    return arr;
  }
  if (ctype === "UINT_32" || ltype?.type === "INTEGER" && ltype.bitWidth === 32 && !ltype.isSigned) {
    if (data instanceof Int32Array) return new Uint32Array(data.buffer, data.byteOffset, data.length);
    const arr = nullable ? new Array(data.length) : new Uint32Array(data.length);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = data[i] < 0 ? 4294967296 + data[i] : data[i];
    }
    return arr;
  }
  if (ltype?.type === "FLOAT16") {
    return Array.from(data).map(parseFloat16);
  }
  if (ltype?.type === "TIMESTAMP") {
    const { unit } = ltype;
    let parser = parsers.timestampFromMilliseconds;
    if (unit === "MICROS") parser = parsers.timestampFromMicroseconds;
    if (unit === "NANOS") parser = parsers.timestampFromNanoseconds;
    const arr = new Array(data.length);
    for (let i = 0; i < arr.length; i++) {
      arr[i] = parser(data[i]);
    }
    return arr;
  }
  return data;
}
function parseDecimal(bytes) {
  if (!bytes.length) return 0;
  let value = 0n;
  for (const byte of bytes) {
    value = value * 256n + BigInt(byte);
  }
  const bits2 = bytes.length * 8;
  if (value >= 2n ** BigInt(bits2 - 1)) {
    value -= 2n ** BigInt(bits2);
  }
  return Number(value);
}
function parseInt96Nanos(value) {
  const days = (value >> 64n) - 2440588n;
  const nano = value & 0xffffffffffffffffn;
  return days * 86400000000000n + nano;
}
function parseFloat16(bytes) {
  if (!bytes) return void 0;
  const int16 = bytes[1] << 8 | bytes[0];
  const sign = int16 >> 15 ? -1 : 1;
  const exp = int16 >> 10 & 31;
  const frac = int16 & 1023;
  if (exp === 0) return sign * 2 ** -14 * (frac / 1024);
  if (exp === 31) return frac ? NaN : sign * Infinity;
  return sign * 2 ** (exp - 15) * (1 + frac / 1024);
}

// node_modules/hyparquet/src/schema.js
function schemaTree(schema, rootIndex, path) {
  const element = schema[rootIndex];
  const children = [];
  let count = 1;
  if (element.num_children) {
    while (children.length < element.num_children) {
      const childElement = schema[rootIndex + count];
      const child = schemaTree(schema, rootIndex + count, [...path, childElement.name]);
      count += child.count;
      children.push(child);
    }
  }
  return { count, element, children, path };
}
function getSchemaPath(schema, name) {
  let tree = schemaTree(schema, 0, []);
  const path = [tree];
  for (const part of name) {
    const child = tree.children.find((child2) => child2.element.name === part);
    if (!child) throw new Error(`parquet schema element not found: ${name}`);
    path.push(child);
    tree = child;
  }
  return path;
}
function getPhysicalColumns(schemaTree2) {
  const columns = [];
  function traverse(node) {
    if (node.children.length) {
      for (const child of node.children) {
        traverse(child);
      }
    } else {
      columns.push(node.path.join("."));
    }
  }
  traverse(schemaTree2);
  return columns;
}
function getMaxRepetitionLevel(schemaPath) {
  let maxLevel = 0;
  for (const { element } of schemaPath) {
    if (element.repetition_type === "REPEATED") {
      maxLevel++;
    }
  }
  return maxLevel;
}
function getMaxDefinitionLevel(schemaPath) {
  let maxLevel = 0;
  for (const { element } of schemaPath.slice(1)) {
    if (element.repetition_type !== "REQUIRED") {
      maxLevel++;
    }
  }
  return maxLevel;
}
function isListLike(schema) {
  if (!schema) return false;
  if (schema.element.converted_type !== "LIST") return false;
  if (schema.children.length > 1) return false;
  const firstChild = schema.children[0];
  if (firstChild.children.length > 1) return false;
  if (firstChild.element.repetition_type !== "REPEATED") return false;
  return true;
}
function isMapLike(schema) {
  if (!schema) return false;
  if (schema.element.converted_type !== "MAP") return false;
  if (schema.children.length > 1) return false;
  const firstChild = schema.children[0];
  if (firstChild.children.length !== 2) return false;
  if (firstChild.element.repetition_type !== "REPEATED") return false;
  const keyChild = firstChild.children.find((child) => child.element.name === "key");
  if (keyChild?.element.repetition_type === "REPEATED") return false;
  const valueChild = firstChild.children.find((child) => child.element.name === "value");
  if (valueChild?.element.repetition_type === "REPEATED") return false;
  return true;
}
function isFlatColumn(schemaPath) {
  if (schemaPath.length !== 2) return false;
  const [, column] = schemaPath;
  if (column.element.repetition_type === "REPEATED") return false;
  if (column.children.length) return false;
  return true;
}

// node_modules/hyparquet/src/thrift.js
var STOP = 0;
var TRUE = 1;
var FALSE = 2;
var BYTE = 3;
var I16 = 4;
var I32 = 5;
var I64 = 6;
var DOUBLE = 7;
var BINARY = 8;
var LIST = 9;
var STRUCT = 12;
function deserializeTCompactProtocol(reader) {
  const value = {};
  let fid = 0;
  while (reader.offset < reader.view.byteLength) {
    const byte = reader.view.getUint8(reader.offset++);
    const type = byte & 15;
    if (type === STOP) break;
    const delta = byte >> 4;
    fid = delta ? fid + delta : readZigZag(reader);
    value[`field_${fid}`] = readElement(reader, type);
  }
  return value;
}
function readElement(reader, type) {
  switch (type) {
    case TRUE:
      return true;
    case FALSE:
      return false;
    case BYTE:
      return reader.view.getInt8(reader.offset++);
    case I16:
    case I32:
      return readZigZag(reader);
    case I64:
      return readZigZagBigInt(reader);
    case DOUBLE: {
      const value = reader.view.getFloat64(reader.offset, true);
      reader.offset += 8;
      return value;
    }
    case BINARY: {
      const stringLength = readVarInt(reader);
      const strBytes = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, stringLength);
      reader.offset += stringLength;
      return strBytes;
    }
    case LIST: {
      const byte = reader.view.getUint8(reader.offset++);
      const elemType = byte & 15;
      let listSize = byte >> 4;
      if (listSize === 15) {
        listSize = readVarInt(reader);
      }
      const boolType = elemType === TRUE || elemType === FALSE;
      const values = new Array(listSize);
      for (let i = 0; i < listSize; i++) {
        values[i] = boolType ? readElement(reader, BYTE) === 1 : readElement(reader, elemType);
      }
      return values;
    }
    case STRUCT:
      return deserializeTCompactProtocol(reader);
    default:
      throw new Error(`thrift unhandled type: ${type}`);
  }
}
function readVarInt(reader) {
  let result = 0;
  let shift = 0;
  while (true) {
    const byte = reader.view.getUint8(reader.offset++);
    result |= (byte & 127) << shift;
    if (!(byte & 128)) {
      return result;
    }
    shift += 7;
  }
}
function readVarBigInt(reader) {
  let result = 0n;
  let shift = 0n;
  while (true) {
    const byte = reader.view.getUint8(reader.offset++);
    result |= BigInt(byte & 127) << shift;
    if (!(byte & 128)) {
      return result;
    }
    shift += 7n;
  }
}
function readZigZag(reader) {
  const zigzag = readVarInt(reader);
  return zigzag >>> 1 ^ -(zigzag & 1);
}
function readZigZagBigInt(reader) {
  const zigzag = readVarBigInt(reader);
  return zigzag >> 1n ^ -(zigzag & 1n);
}

// node_modules/hyparquet/src/geoparquet.js
function markGeoColumns(schema, key_value_metadata) {
  const columns = /* @__PURE__ */ new Map();
  const geo = key_value_metadata?.find(({ key }) => key === "geo")?.value;
  const decodedColumns = (geo && JSON.parse(geo)?.columns) ?? {};
  for (const [name, column] of Object.entries(decodedColumns)) {
    if (column.encoding !== "WKB") continue;
    const type = column.edges === "spherical" ? "GEOGRAPHY" : "GEOMETRY";
    const id = column.crs?.id ?? column.crs?.ids?.[0];
    const crs = id ? `${id.authority}:${id.code.toString()}` : void 0;
    columns.set(name, { type, crs });
  }
  for (let i = 1; i < schema.length; i++) {
    const { logical_type, name, num_children, type } = schema[i];
    if (num_children) {
      i += num_children;
      continue;
    }
    if (type === "BYTE_ARRAY" && !logical_type) {
      schema[i].logical_type = columns.get(name);
    }
  }
}

// node_modules/hyparquet/src/metadata.js
var defaultInitialFetchSize = 1 << 19;
var decoder2 = new TextDecoder();
function decode(value) {
  return value && decoder2.decode(value);
}
async function parquetMetadataAsync(asyncBuffer, { parsers, initialFetchSize = defaultInitialFetchSize, geoparquet = true } = {}) {
  if (!asyncBuffer || !(asyncBuffer.byteLength >= 0)) throw new Error("parquet expected AsyncBuffer");
  const footerOffset = Math.max(0, asyncBuffer.byteLength - initialFetchSize);
  const footerBuffer = await asyncBuffer.slice(footerOffset, asyncBuffer.byteLength);
  const footerView = new DataView(footerBuffer);
  if (footerView.getUint32(footerBuffer.byteLength - 4, true) !== 827474256) {
    throw new Error("parquet file invalid (footer != PAR1)");
  }
  const metadataLength = footerView.getUint32(footerBuffer.byteLength - 8, true);
  if (metadataLength > asyncBuffer.byteLength - 8) {
    throw new Error(`parquet metadata length ${metadataLength} exceeds available buffer ${asyncBuffer.byteLength - 8}`);
  }
  if (metadataLength + 8 > initialFetchSize) {
    const metadataOffset = asyncBuffer.byteLength - metadataLength - 8;
    const metadataBuffer = await asyncBuffer.slice(metadataOffset, footerOffset);
    const combinedBuffer = new ArrayBuffer(metadataLength + 8);
    const combinedView = new Uint8Array(combinedBuffer);
    combinedView.set(new Uint8Array(metadataBuffer));
    combinedView.set(new Uint8Array(footerBuffer), footerOffset - metadataOffset);
    return parquetMetadata(combinedBuffer, { parsers, geoparquet });
  } else {
    return parquetMetadata(footerBuffer, { parsers, geoparquet });
  }
}
function parquetMetadata(arrayBuffer, { parsers, geoparquet = true } = {}) {
  if (!(arrayBuffer instanceof ArrayBuffer)) throw new Error("parquet expected ArrayBuffer");
  const view = new DataView(arrayBuffer);
  parsers = { ...DEFAULT_PARSERS, ...parsers };
  if (view.byteLength < 8) {
    throw new Error("parquet file is too short");
  }
  if (view.getUint32(view.byteLength - 4, true) !== 827474256) {
    throw new Error("parquet file invalid (footer != PAR1)");
  }
  const metadataLengthOffset = view.byteLength - 8;
  const metadataLength = view.getUint32(metadataLengthOffset, true);
  if (metadataLength > view.byteLength - 8) {
    throw new Error(`parquet metadata length ${metadataLength} exceeds available buffer ${view.byteLength - 8}`);
  }
  const metadataOffset = metadataLengthOffset - metadataLength;
  const reader = { view, offset: metadataOffset };
  const metadata = deserializeTCompactProtocol(reader);
  const version = metadata.field_1;
  const schema = metadata.field_2.map((field) => ({
    type: ParquetTypes[field.field_1],
    type_length: field.field_2,
    repetition_type: FieldRepetitionTypes[field.field_3],
    name: decode(field.field_4),
    num_children: field.field_5,
    converted_type: ConvertedTypes[field.field_6],
    scale: field.field_7,
    precision: field.field_8,
    field_id: field.field_9,
    logical_type: logicalType(field.field_10)
  }));
  const columnSchema = schema.filter((e) => e.type);
  const num_rows = metadata.field_3;
  const row_groups = metadata.field_4.map((rowGroup) => ({
    columns: rowGroup.field_1.map((column, columnIndex) => ({
      file_path: decode(column.field_1),
      file_offset: column.field_2,
      meta_data: column.field_3 && {
        type: ParquetTypes[column.field_3.field_1],
        encodings: column.field_3.field_2?.map((e) => Encodings[e]),
        path_in_schema: column.field_3.field_3.map(decode),
        codec: CompressionCodecs[column.field_3.field_4],
        num_values: column.field_3.field_5,
        total_uncompressed_size: column.field_3.field_6,
        total_compressed_size: column.field_3.field_7,
        key_value_metadata: column.field_3.field_8?.map((kv) => ({
          key: decode(kv.field_1),
          value: decode(kv.field_2)
        })),
        data_page_offset: column.field_3.field_9,
        index_page_offset: column.field_3.field_10,
        dictionary_page_offset: column.field_3.field_11,
        statistics: convertStats(column.field_3.field_12, columnSchema[columnIndex], parsers),
        encoding_stats: column.field_3.field_13?.map((encodingStat) => ({
          page_type: PageTypes[encodingStat.field_1],
          encoding: Encodings[encodingStat.field_2],
          count: encodingStat.field_3
        })),
        bloom_filter_offset: column.field_3.field_14,
        bloom_filter_length: column.field_3.field_15,
        size_statistics: column.field_3.field_16 && {
          unencoded_byte_array_data_bytes: column.field_3.field_16.field_1,
          repetition_level_histogram: column.field_3.field_16.field_2,
          definition_level_histogram: column.field_3.field_16.field_3
        },
        geospatial_statistics: column.field_3.field_17 && {
          bbox: column.field_3.field_17.field_1 && {
            xmin: column.field_3.field_17.field_1.field_1,
            xmax: column.field_3.field_17.field_1.field_2,
            ymin: column.field_3.field_17.field_1.field_3,
            ymax: column.field_3.field_17.field_1.field_4,
            zmin: column.field_3.field_17.field_1.field_5,
            zmax: column.field_3.field_17.field_1.field_6,
            mmin: column.field_3.field_17.field_1.field_7,
            mmax: column.field_3.field_17.field_1.field_8
          },
          geospatial_types: column.field_3.field_17.field_2
        }
      },
      offset_index_offset: column.field_4,
      offset_index_length: column.field_5,
      column_index_offset: column.field_6,
      column_index_length: column.field_7,
      crypto_metadata: column.field_8,
      encrypted_column_metadata: column.field_9
    })),
    total_byte_size: rowGroup.field_2,
    num_rows: rowGroup.field_3,
    sorting_columns: rowGroup.field_4?.map((sortingColumn) => ({
      column_idx: sortingColumn.field_1,
      descending: sortingColumn.field_2,
      nulls_first: sortingColumn.field_3
    })),
    file_offset: rowGroup.field_5,
    total_compressed_size: rowGroup.field_6,
    ordinal: rowGroup.field_7
  }));
  const key_value_metadata = metadata.field_5?.map((kv) => ({
    key: decode(kv.field_1),
    value: decode(kv.field_2)
  }));
  const created_by = decode(metadata.field_6);
  if (geoparquet) {
    markGeoColumns(schema, key_value_metadata);
  }
  return {
    version,
    schema,
    num_rows,
    row_groups,
    key_value_metadata,
    created_by,
    metadata_length: metadataLength
  };
}
function parquetSchema({ schema }) {
  return getSchemaPath(schema, [])[0];
}
function logicalType(logicalType2) {
  if (logicalType2?.field_1) return { type: "STRING" };
  if (logicalType2?.field_2) return { type: "MAP" };
  if (logicalType2?.field_3) return { type: "LIST" };
  if (logicalType2?.field_4) return { type: "ENUM" };
  if (logicalType2?.field_5) return {
    type: "DECIMAL",
    scale: logicalType2.field_5.field_1,
    precision: logicalType2.field_5.field_2
  };
  if (logicalType2?.field_6) return { type: "DATE" };
  if (logicalType2?.field_7) return {
    type: "TIME",
    isAdjustedToUTC: logicalType2.field_7.field_1,
    unit: timeUnit(logicalType2.field_7.field_2)
  };
  if (logicalType2?.field_8) return {
    type: "TIMESTAMP",
    isAdjustedToUTC: logicalType2.field_8.field_1,
    unit: timeUnit(logicalType2.field_8.field_2)
  };
  if (logicalType2?.field_10) return {
    type: "INTEGER",
    bitWidth: logicalType2.field_10.field_1,
    isSigned: logicalType2.field_10.field_2
  };
  if (logicalType2?.field_11) return { type: "NULL" };
  if (logicalType2?.field_12) return { type: "JSON" };
  if (logicalType2?.field_13) return { type: "BSON" };
  if (logicalType2?.field_14) return { type: "UUID" };
  if (logicalType2?.field_15) return { type: "FLOAT16" };
  if (logicalType2?.field_16) return {
    type: "VARIANT",
    specification_version: logicalType2.field_16.field_1
  };
  if (logicalType2?.field_17) return {
    type: "GEOMETRY",
    crs: decode(logicalType2.field_17.field_1)
  };
  if (logicalType2?.field_18) return {
    type: "GEOGRAPHY",
    crs: decode(logicalType2.field_18.field_1),
    algorithm: EdgeInterpolationAlgorithms[logicalType2.field_18.field_2]
  };
  return logicalType2;
}
function timeUnit(unit) {
  if (unit.field_1) return "MILLIS";
  if (unit.field_2) return "MICROS";
  if (unit.field_3) return "NANOS";
  throw new Error("parquet time unit required");
}
function convertStats(stats, schema, parsers) {
  return stats && {
    max: convertMetadata(stats.field_1, schema, parsers),
    min: convertMetadata(stats.field_2, schema, parsers),
    null_count: stats.field_3,
    distinct_count: stats.field_4,
    max_value: convertMetadata(stats.field_5, schema, parsers),
    min_value: convertMetadata(stats.field_6, schema, parsers),
    is_max_value_exact: stats.field_7,
    is_min_value_exact: stats.field_8
  };
}
function convertMetadata(value, schema, parsers) {
  const { type, converted_type, logical_type } = schema;
  if (value === void 0) return value;
  if (type === "BOOLEAN") return value[0] === 1;
  if (type === "BYTE_ARRAY") return parsers.stringFromBytes(value);
  const view = new DataView(value.buffer, value.byteOffset, value.byteLength);
  if (type === "FLOAT" && view.byteLength === 4) return view.getFloat32(0, true);
  if (type === "DOUBLE" && view.byteLength === 8) return view.getFloat64(0, true);
  if (type === "INT32" && converted_type === "DATE") return parsers.dateFromDays(view.getInt32(0, true));
  if (type === "INT64" && converted_type === "TIMESTAMP_MILLIS") return parsers.timestampFromMilliseconds(view.getBigInt64(0, true));
  if (type === "INT64" && converted_type === "TIMESTAMP_MICROS") return parsers.timestampFromMicroseconds(view.getBigInt64(0, true));
  if (type === "INT64" && logical_type?.type === "TIMESTAMP" && logical_type?.unit === "NANOS") return parsers.timestampFromNanoseconds(view.getBigInt64(0, true));
  if (type === "INT64" && logical_type?.type === "TIMESTAMP" && logical_type?.unit === "MICROS") return parsers.timestampFromMicroseconds(view.getBigInt64(0, true));
  if (type === "INT64" && logical_type?.type === "TIMESTAMP") return parsers.timestampFromMilliseconds(view.getBigInt64(0, true));
  if (type === "INT32" && view.byteLength === 4) return view.getInt32(0, true);
  if (type === "INT64" && view.byteLength === 8) return view.getBigInt64(0, true);
  if (converted_type === "DECIMAL") return parseDecimal(value) * 10 ** -(schema.scale || 0);
  if (logical_type?.type === "FLOAT16") return parseFloat16(value);
  if (logical_type?.type === "UUID") return parsers.uuidFromBytes(value);
  if (type === "FIXED_LEN_BYTE_ARRAY") return value;
  return value;
}

// node_modules/hyparquet/src/indexes.js
function readOffsetIndex(reader) {
  const thrift = deserializeTCompactProtocol(reader);
  return {
    // @ts-ignore
    page_locations: thrift.field_1.map((loc) => ({
      offset: loc.field_1,
      compressed_page_size: loc.field_2,
      first_row_index: loc.field_3
    })),
    unencoded_byte_array_data_bytes: thrift.field_2
  };
}

// node_modules/hyparquet/src/xxhash.js
var MASK = 0xffffffffffffffffn;
var PRIME1 = 0x9e3779b185ebca87n;
var PRIME2 = 0xc2b2ae3d27d4eb4fn;
var PRIME3 = 0x165667b19e3779f9n;
var PRIME4 = 0x85ebca77c2b2ae63n;
var PRIME5 = 0x27d4eb2f165667c5n;
function rotl64(x, r) {
  return (x << r | x >> 64n - r) & MASK;
}
function round(acc, val) {
  acc = acc + val * PRIME2 & MASK;
  acc = rotl64(acc, 31n);
  return acc * PRIME1 & MASK;
}
function mergeRound(acc, val) {
  acc ^= round(0n, val);
  return acc * PRIME1 + PRIME4 & MASK;
}
function xxhash64(input, seed = 0n) {
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const len = input.byteLength;
  let offset = 0;
  let h64;
  if (len >= 32) {
    let v1 = seed + PRIME1 + PRIME2 & MASK;
    let v2 = seed + PRIME2 & MASK;
    let v3 = seed;
    let v4 = seed - PRIME1 & MASK;
    while (offset + 32 <= len) {
      v1 = round(v1, view.getBigUint64(offset, true));
      offset += 8;
      v2 = round(v2, view.getBigUint64(offset, true));
      offset += 8;
      v3 = round(v3, view.getBigUint64(offset, true));
      offset += 8;
      v4 = round(v4, view.getBigUint64(offset, true));
      offset += 8;
    }
    h64 = rotl64(v1, 1n) + rotl64(v2, 7n) + rotl64(v3, 12n) + rotl64(v4, 18n) & MASK;
    h64 = mergeRound(h64, v1);
    h64 = mergeRound(h64, v2);
    h64 = mergeRound(h64, v3);
    h64 = mergeRound(h64, v4);
  } else {
    h64 = seed + PRIME5 & MASK;
  }
  h64 = h64 + BigInt(len) & MASK;
  while (offset + 8 <= len) {
    h64 ^= round(0n, view.getBigUint64(offset, true));
    h64 = rotl64(h64, 27n) * PRIME1 + PRIME4 & MASK;
    offset += 8;
  }
  if (offset + 4 <= len) {
    h64 ^= BigInt(view.getUint32(offset, true)) * PRIME1 & MASK;
    h64 = rotl64(h64, 23n) * PRIME2 + PRIME3 & MASK;
    offset += 4;
  }
  while (offset < len) {
    h64 ^= BigInt(view.getUint8(offset)) * PRIME5 & MASK;
    h64 = rotl64(h64, 11n) * PRIME1 & MASK;
    offset += 1;
  }
  h64 ^= h64 >> 33n;
  h64 = h64 * PRIME2 & MASK;
  h64 ^= h64 >> 29n;
  h64 = h64 * PRIME3 & MASK;
  h64 ^= h64 >> 32n;
  return h64;
}

// node_modules/hyparquet/src/bloom.js
var textEncoder = new TextEncoder();
var SALT = new Uint32Array([
  1203114875,
  1150766481,
  2284105051,
  2729912477,
  1884591559,
  770785867,
  2667333959,
  1550580529
]);
function blockIndex(hash, numBlocks) {
  return Number((hash >> 32n) * BigInt(numBlocks) >> 32n);
}
function blockMask(hash) {
  const m = new Uint32Array(8);
  const low = Number(hash & 0xffffffffn) | 0;
  for (let i = 0; i < 8; i++) {
    m[i] = 1 << (Math.imul(low, SALT[i]) >>> 27);
  }
  return m;
}
function sbbfContains(blocks, hash) {
  const offset = blockIndex(hash, blocks.length >> 3) << 3;
  const m = blockMask(hash);
  for (let i = 0; i < 8; i++) {
    if ((blocks[offset + i] & m[i]) === 0) return false;
  }
  return true;
}
function readBloomFilter(reader) {
  const header = deserializeTCompactProtocol(reader);
  const numBytes = header.field_1;
  if (typeof numBytes !== "number" || numBytes <= 0 || numBytes % 32 !== 0) return void 0;
  if (!header.field_2?.field_1) return void 0;
  if (!header.field_3?.field_1) return void 0;
  if (!header.field_4?.field_1) return void 0;
  const { view, offset } = reader;
  if (offset + numBytes > view.byteLength) {
    throw new Error(`parquet bloom filter truncated: need ${numBytes} bytes, have ${view.byteLength - offset}`);
  }
  const blocks = new Uint32Array(numBytes >> 2);
  for (let i = 0; i < blocks.length; i++) {
    blocks[i] = view.getUint32(offset + i * 4, true);
  }
  reader.offset = offset + numBytes;
  return { numBytes, blocks };
}
function hashParquetValue(value, element) {
  if (value === null || value === void 0) return void 0;
  const { type, converted_type, logical_type } = element;
  if (type === "BOOLEAN") {
    if (typeof value !== "boolean") return void 0;
    return xxhash64(new Uint8Array([value ? 1 : 0]));
  }
  if (type === "FLOAT") {
    if (typeof value !== "number") return void 0;
    const buf = new ArrayBuffer(4);
    new DataView(buf).setFloat32(0, value, true);
    return xxhash64(new Uint8Array(buf));
  }
  if (type === "DOUBLE") {
    if (typeof value !== "number") return void 0;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, value, true);
    return xxhash64(new Uint8Array(buf));
  }
  if (type === "INT32") {
    if (converted_type === "DATE" || converted_type === "DECIMAL" || converted_type === "TIME_MILLIS") return void 0;
    if (logical_type?.type === "DATE" || logical_type?.type === "TIME" || logical_type?.type === "DECIMAL") return void 0;
    if (typeof value !== "number" || !Number.isInteger(value)) return void 0;
    const buf = new ArrayBuffer(4);
    new DataView(buf).setInt32(0, value | 0, true);
    return xxhash64(new Uint8Array(buf));
  }
  if (type === "INT64") {
    if (converted_type === "TIMESTAMP_MILLIS" || converted_type === "TIMESTAMP_MICROS") return void 0;
    if (converted_type === "TIME_MICROS" || converted_type === "DECIMAL") return void 0;
    if (logical_type?.type === "TIMESTAMP" || logical_type?.type === "TIME" || logical_type?.type === "DECIMAL") return void 0;
    let bigValue;
    if (typeof value === "bigint") bigValue = value;
    else if (typeof value === "number" && Number.isSafeInteger(value)) bigValue = BigInt(value);
    else return void 0;
    const buf = new ArrayBuffer(8);
    new DataView(buf).setBigUint64(0, BigInt.asUintN(64, bigValue), true);
    return xxhash64(new Uint8Array(buf));
  }
  if (type === "BYTE_ARRAY") {
    if (converted_type === "JSON" || converted_type === "BSON" || converted_type === "DECIMAL") return void 0;
    if (logical_type?.type === "JSON" || logical_type?.type === "BSON" || logical_type?.type === "VARIANT") return void 0;
    if (logical_type?.type === "GEOMETRY" || logical_type?.type === "GEOGRAPHY") return void 0;
    if (typeof value === "string") return xxhash64(textEncoder.encode(value));
    if (value instanceof Uint8Array) return xxhash64(value);
    return void 0;
  }
  if (type === "FIXED_LEN_BYTE_ARRAY") {
    if (converted_type === "DECIMAL" || converted_type === "INTERVAL") return void 0;
    if (logical_type?.type === "DECIMAL" || logical_type?.type === "UUID" || logical_type?.type === "FLOAT16") return void 0;
    if (logical_type?.type === "GEOMETRY" || logical_type?.type === "GEOGRAPHY") return void 0;
    if (value instanceof Uint8Array) return xxhash64(value);
    return void 0;
  }
  return void 0;
}
function bloomEligibleColumns(filter) {
  const out = /* @__PURE__ */ new Set();
  walkBloomEligible(filter, out);
  return out;
}
function walkBloomEligible(filter, out) {
  if (!filter) return;
  if ("$and" in filter && Array.isArray(filter.$and)) {
    for (const sub of filter.$and) walkBloomEligible(sub, out);
    return;
  }
  if ("$or" in filter && Array.isArray(filter.$or)) {
    for (const sub of filter.$or) walkBloomEligible(sub, out);
    return;
  }
  if ("$nor" in filter) return;
  for (const [field, condition] of Object.entries(filter)) {
    if (field.startsWith("$")) continue;
    if (typeof condition === "object" && condition !== null && !Array.isArray(condition)) {
      if ("$eq" in condition || "$in" in condition) out.add(field);
    } else {
      out.add(field);
    }
  }
}

// node_modules/hyparquet/src/utils.js
function concat(aaa, bbb) {
  const chunk = 1e4;
  for (let i = 0; i < bbb.length; i += chunk) {
    aaa.push(...bbb.slice(i, i + chunk));
  }
}
function equals(a, b, strict = true) {
  if (strict ? a === b : a == b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (a instanceof Uint8Array && b instanceof Uint8Array) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i], strict)) return false;
    }
    return true;
  }
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const k of aKeys) {
    if (!equals(a[k], b[k], strict)) return false;
  }
  return true;
}
function flatten(chunks) {
  if (!chunks) return [];
  if (chunks.length === 1) return chunks[0];
  const output = [];
  for (const chunk of chunks) {
    concat(output, chunk);
  }
  return output;
}

// node_modules/hyparquet/src/filter.js
function columnsNeededForFilter(filter) {
  if (!filter) return [];
  const columns = [];
  if ("$and" in filter && Array.isArray(filter.$and)) {
    columns.push(...filter.$and.flatMap(columnsNeededForFilter));
  } else if ("$or" in filter && Array.isArray(filter.$or)) {
    columns.push(...filter.$or.flatMap(columnsNeededForFilter));
  } else if ("$nor" in filter && Array.isArray(filter.$nor)) {
    columns.push(...filter.$nor.flatMap(columnsNeededForFilter));
  } else {
    columns.push(...Object.keys(filter).map((key) => key.split(".")[0]));
  }
  return [...new Set(columns)];
}
function matchFilter(record, filter, strict = true) {
  if ("$and" in filter && Array.isArray(filter.$and)) {
    return filter.$and.every((subQuery) => matchFilter(record, subQuery, strict));
  }
  if ("$or" in filter && Array.isArray(filter.$or)) {
    return filter.$or.some((subQuery) => matchFilter(record, subQuery, strict));
  }
  if ("$nor" in filter && Array.isArray(filter.$nor)) {
    return !filter.$nor.some((subQuery) => matchFilter(record, subQuery, strict));
  }
  return Object.entries(filter).every(([field, condition]) => {
    const value = resolve(record, field);
    if (typeof condition !== "object" || condition === null || Array.isArray(condition)) {
      return equals(value, condition, strict);
    }
    return Object.entries(condition || {}).every(([operator, target]) => {
      if (operator === "$gt") return value > target;
      if (operator === "$gte") return value >= target;
      if (operator === "$lt") return value < target;
      if (operator === "$lte") return value <= target;
      if (operator === "$eq") return equals(value, target, strict);
      if (operator === "$ne") return !equals(value, target, strict);
      if (operator === "$in") return Array.isArray(target) && target.includes(value);
      if (operator === "$nin") return Array.isArray(target) && !target.includes(value);
      if (operator === "$not") return !matchFilter({ [field]: value }, { [field]: target }, strict);
      return true;
    });
  });
}
function canSkipRowGroup({ rowGroup, physicalColumns, filter, strict = true, bloomFilters, schemaElements }) {
  if (!filter) return false;
  if ("$and" in filter && Array.isArray(filter.$and)) {
    return filter.$and.some((subFilter) => canSkipRowGroup({ rowGroup, physicalColumns, filter: subFilter, strict, bloomFilters, schemaElements }));
  }
  if ("$or" in filter && Array.isArray(filter.$or)) {
    return filter.$or.every((subFilter) => canSkipRowGroup({ rowGroup, physicalColumns, filter: subFilter, strict, bloomFilters, schemaElements }));
  }
  if ("$nor" in filter && Array.isArray(filter.$nor)) {
    return false;
  }
  for (const [field, condition] of Object.entries(filter)) {
    const columnIndex = physicalColumns.indexOf(field);
    if (columnIndex === -1) continue;
    const stats = rowGroup.columns[columnIndex].meta_data?.statistics;
    const { min, max: max2, min_value, max_value } = stats || {};
    const minVal = min_value !== void 0 ? min_value : min;
    const maxVal = max_value !== void 0 ? max_value : max2;
    const haveStats = minVal !== void 0 && maxVal !== void 0;
    const bloom = bloomFilters?.[field];
    const element = schemaElements?.[field];
    for (const [operator, target] of Object.entries(condition || {})) {
      if (haveStats) {
        if (operator === "$gt" && maxVal <= target) return true;
        if (operator === "$gte" && maxVal < target) return true;
        if (operator === "$lt" && minVal >= target) return true;
        if (operator === "$lte" && minVal > target) return true;
        if (operator === "$eq" && (target < minVal || target > maxVal)) return true;
        if (operator === "$ne" && equals(minVal, maxVal, strict) && equals(minVal, target, strict)) return true;
        if (operator === "$in" && Array.isArray(target) && target.every((v) => v < minVal || v > maxVal)) return true;
        if (operator === "$nin" && Array.isArray(target) && equals(minVal, maxVal, strict) && target.includes(minVal)) return true;
      }
      if (bloom && element) {
        if (operator === "$eq") {
          const hash = hashParquetValue(target, element);
          if (hash !== void 0 && !sbbfContains(bloom.blocks, hash)) return true;
        }
        if (operator === "$in" && Array.isArray(target) && target.length > 0) {
          let allAbsent = true;
          for (const v of target) {
            const h = hashParquetValue(v, element);
            if (h === void 0 || sbbfContains(bloom.blocks, h)) {
              allAbsent = false;
              break;
            }
          }
          if (allAbsent) return true;
        }
      }
    }
  }
  return false;
}
function resolve(record, path) {
  let value = record;
  for (const part of path.split(".")) {
    value = value?.[part];
  }
  return value;
}

// node_modules/hyparquet/src/plan.js
var runLimit = 1 << 21;
function parquetPlan({ metadata, rowStart = 0, rowEnd = Infinity, columns, filter, filterStrict = true, useOffsetIndex = false, bloomFiltersByGroup, schemaElements }) {
  if (!metadata) throw new Error("parquetPlan requires metadata");
  const groups = [];
  const fetches = [];
  const indexes = [];
  const physicalColumns = getPhysicalColumns(parquetSchema(metadata));
  let groupStart = 0;
  let rgIdx = 0;
  for (const rowGroup of metadata.row_groups) {
    const groupRows = Number(rowGroup.num_rows);
    const groupEnd = groupStart + groupRows;
    const bloomFilters = bloomFiltersByGroup?.[rgIdx];
    if (groupRows > 0 && groupEnd > rowStart && groupStart < rowEnd && !canSkipRowGroup({ rowGroup, physicalColumns, filter, strict: filterStrict, bloomFilters, schemaElements })) {
      const chunks = [];
      let groupStartByte = Infinity;
      let groupEndByte = -Infinity;
      for (const chunk of rowGroup.columns) {
        const meta = chunk.meta_data;
        if (chunk.file_path) throw new Error("parquet file_path not supported");
        if (!meta) throw new Error("parquet column metadata is undefined");
        if (!columns || columns.includes(meta.path_in_schema[0])) {
          const columnOffset = meta.dictionary_page_offset || meta.data_page_offset;
          const startByte = Number(columnOffset);
          const endByte = Number(columnOffset + meta.total_compressed_size);
          if (startByte < groupStartByte) groupStartByte = startByte;
          if (endByte > groupEndByte) groupEndByte = endByte;
          if (useOffsetIndex && chunk.offset_index_offset && chunk.offset_index_length && (rowStart > groupStart || rowEnd < groupEnd)) {
            const offsetIndexStart = Number(chunk.offset_index_offset);
            chunks.push({
              columnMetadata: meta,
              offsetIndex: {
                startByte: offsetIndexStart,
                endByte: offsetIndexStart + chunk.offset_index_length
              },
              range: { startByte, endByte }
            });
          } else {
            chunks.push({
              columnMetadata: meta,
              range: { startByte, endByte }
            });
          }
        }
      }
      const selectStart = Math.max(rowStart - groupStart, 0);
      const selectEnd = Math.min(rowEnd - groupStart, groupRows);
      groups.push({ chunks, rowGroup, groupStart, groupRows, selectStart, selectEnd });
      let run;
      for (const chunk of chunks) {
        if ("offsetIndex" in chunk) {
          indexes.push(chunk.offsetIndex);
        } else {
          const { range } = chunk;
          if (columns) {
            fetches.push(range);
          } else if (run && range.endByte - run.startByte <= runLimit) {
            run.endByte = range.endByte;
          } else {
            if (run) fetches.push(run);
            run = { ...range };
          }
        }
      }
      if (run) fetches.push(run);
    }
    groupStart = groupEnd;
    rgIdx++;
  }
  if (!isFinite(rowEnd)) rowEnd = groupStart;
  fetches.push(...indexes);
  return { metadata, rowStart, rowEnd, columns, fetches, groups };
}
async function prefetchBloomFilters({ file, metadata, filter, filterStrict = true }) {
  const result = metadata.row_groups.map(() => (
    /** @type {Record<string, BloomFilter>} */
    {}
  ));
  const eligibleCols = bloomEligibleColumns(filter);
  if (eligibleCols.size === 0) return result;
  const physicalColumns = getPhysicalColumns(parquetSchema(metadata));
  const tasks = [];
  metadata.row_groups.forEach((rowGroup, rgIdx) => {
    if (canSkipRowGroup({ rowGroup, physicalColumns, filter, strict: filterStrict })) return;
    for (const colName of eligibleCols) {
      const columnIdx = physicalColumns.indexOf(colName);
      if (columnIdx === -1) continue;
      const meta = rowGroup.columns[columnIdx]?.meta_data;
      if (!meta?.bloom_filter_offset || !meta.bloom_filter_length) continue;
      const start = Number(meta.bloom_filter_offset);
      const end = start + meta.bloom_filter_length;
      tasks.push((async () => {
        const buffer = await file.slice(start, end);
        const bloom = readBloomFilter({ view: new DataView(buffer), offset: 0 });
        if (bloom) result[rgIdx][colName] = bloom;
      })());
    }
  });
  if (tasks.length) await Promise.all(tasks);
  return result;
}
function prefetchAsyncBuffer(file, { fetches }) {
  const promises = fetches.map(({ startByte, endByte }) => file.slice(startByte, endByte));
  return {
    byteLength: file.byteLength,
    slice(start, end = file.byteLength) {
      const index = fetches.findIndex(({ startByte, endByte }) => startByte <= start && end <= endByte);
      if (index < 0) {
        return file.slice(start, end);
      }
      if (fetches[index].startByte !== start || fetches[index].endByte !== end) {
        const startOffset = start - fetches[index].startByte;
        const endOffset = end - fetches[index].startByte;
        if (promises[index] instanceof Promise) {
          return promises[index].then((buffer) => buffer.slice(startOffset, endOffset));
        } else {
          return promises[index].slice(startOffset, endOffset);
        }
      } else {
        return promises[index];
      }
    }
  };
}

// node_modules/hyparquet/src/variant.js
var decoder3 = new TextDecoder();
var metadataCache = /* @__PURE__ */ new WeakMap();
function decodeVariantColumn(value, parsers = DEFAULT_PARSERS) {
  if (Array.isArray(value)) {
    return value.map((entry) => decodeVariantColumn(entry, parsers));
  }
  if (typeof value !== "object") return value;
  if ("metadata" in value) {
    const metadata = parseVariantMetadata(value.metadata);
    const shreddedFields = value.typed_value && decodeTypedValue(value.typed_value, metadata, parsers);
    const binaryValue = value.value && readVariant(makeReader(value.value), metadata, parsers);
    if (shreddedFields && binaryValue) {
      return { ...binaryValue, ...shreddedFields };
    }
    return shreddedFields ?? binaryValue;
  }
  return value;
}
function decodeTypedValue(typedValue, metadata, parsers) {
  if (typedValue instanceof Date) return typedValue;
  if (typedValue && typeof typedValue === "object" && !Array.isArray(typedValue) && !(typedValue instanceof Uint8Array)) {
    if ("typed_value" in typedValue && typedValue.typed_value !== null && typedValue.typed_value !== void 0) {
      return decodeTypedValue(typedValue.typed_value, metadata, parsers);
    }
    if ("value" in typedValue && typedValue.value instanceof Uint8Array) {
      return readVariant(makeReader(typedValue.value), metadata, parsers);
    }
    if ("typed_value" in typedValue || "value" in typedValue) {
      return null;
    }
    const result = {};
    for (const [key, field] of Object.entries(typedValue)) {
      if (!metadata.dictionary.includes(key)) continue;
      result[key] = decodeTypedValue(field, metadata, parsers);
    }
    return result;
  }
  if (typedValue instanceof Uint8Array) {
    return readVariant(makeReader(typedValue), metadata, parsers);
  }
  if (Array.isArray(typedValue)) {
    return typedValue.map((element) => decodeTypedValue(element, metadata, parsers));
  }
  return typedValue;
}
function makeReader(bytes) {
  return { view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), offset: 0 };
}
function parseVariantMetadata(bytes) {
  let bufferCache = metadataCache.get(bytes.buffer);
  if (!bufferCache) {
    bufferCache = /* @__PURE__ */ new Map();
    metadataCache.set(bytes.buffer, bufferCache);
  }
  const key = `${bytes.byteOffset}:${bytes.byteLength}`;
  const cached = bufferCache.get(key);
  if (cached) return cached;
  const reader = makeReader(bytes);
  const header = reader.view.getUint8(reader.offset++);
  const version = header & 15;
  if (version !== 1) throw new Error(`parquet unsupported variant metadata version: ${version}`);
  const sorted = (header >> 4 & 1) === 1;
  const offsetSize = (header >> 6 & 3) + 1;
  const dictionarySize = readUnsigned(reader, offsetSize);
  const offsets = new Array(dictionarySize + 1);
  for (let i = 0; i < offsets.length; i++) {
    offsets[i] = readUnsigned(reader, offsetSize);
  }
  const base2 = reader.offset;
  const dictionary = new Array(dictionarySize);
  for (let i = 0; i < dictionarySize; i++) {
    const start = offsets[i];
    const end = offsets[i + 1];
    const strBytes = new Uint8Array(bytes.buffer, bytes.byteOffset + base2 + start, end - start);
    dictionary[i] = decoder3.decode(strBytes);
  }
  const metadata = { dictionary, sorted };
  bufferCache.set(key, metadata);
  return metadata;
}
function readUnsigned(reader, byteWidth2) {
  let value = 0;
  for (let i = 0; i < byteWidth2; i++) {
    value |= reader.view.getUint8(reader.offset + i) << i * 8;
  }
  reader.offset += byteWidth2;
  return value;
}
function readVariant(reader, metadata, parsers) {
  const typeByte = reader.view.getUint8(reader.offset++);
  const basicType = typeByte & 3;
  const header = typeByte >> 2;
  if (basicType === 0) return readVariantPrimitive(reader, header, parsers);
  if (basicType === 2) return readVariantObject(reader, header, metadata, parsers);
  if (basicType === 3) return readVariantArray(reader, header, metadata, parsers);
  const bytes = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, header);
  reader.offset += header;
  return decoder3.decode(bytes);
}
function readVariantPrimitive(reader, typeId, parsers) {
  switch (typeId) {
    case 0:
      return null;
    case 1:
      return true;
    case 2:
      return false;
    case 3: {
      const value = reader.view.getInt8(reader.offset);
      reader.offset += 1;
      return value;
    }
    case 4: {
      const value = reader.view.getInt16(reader.offset, true);
      reader.offset += 2;
      return value;
    }
    case 5: {
      const value = reader.view.getInt32(reader.offset, true);
      reader.offset += 4;
      return value;
    }
    case 6: {
      const value = reader.view.getBigInt64(reader.offset, true);
      reader.offset += 8;
      return value;
    }
    case 7: {
      const value = reader.view.getFloat64(reader.offset, true);
      reader.offset += 8;
      return value;
    }
    case 8:
      return readVariantDecimal(reader, 4);
    case 9:
      return readVariantDecimal(reader, 8);
    case 10:
      return readVariantDecimal(reader, 16);
    case 11: {
      const value = reader.view.getInt32(reader.offset, true);
      reader.offset += 4;
      return parsers.dateFromDays(value);
    }
    case 12:
    // timestamp_micros (utc)
    case 13: {
      const value = reader.view.getBigInt64(reader.offset, true);
      reader.offset += 8;
      return parsers.timestampFromMicroseconds(value);
    }
    case 14: {
      const value = reader.view.getFloat32(reader.offset, true);
      reader.offset += 4;
      return value;
    }
    case 15:
      return readVariantBinary(reader);
    case 16: {
      const bytes = readVariantBinary(reader);
      return decoder3.decode(bytes);
    }
    case 17: {
      const value = reader.view.getBigInt64(reader.offset, true);
      reader.offset += 8;
      return value;
    }
    case 18:
    // timestamp_nanos (utc)
    case 19: {
      const value = reader.view.getBigInt64(reader.offset, true);
      reader.offset += 8;
      return parsers.timestampFromNanoseconds(value);
    }
    case 20: {
      const bytes = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, 16);
      reader.offset += 16;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    default:
      throw new Error(`parquet unsupported variant primitive type: ${typeId}`);
  }
}
function readVariantObject(reader, header, metadata, parsers) {
  const offsetWidth = (header & 3) + 1;
  const idWidth = (header >> 2 & 3) + 1;
  const isLarge = header >> 4 & 1;
  const numElements = isLarge ? readUnsigned(reader, 4) : reader.view.getUint8(reader.offset++);
  const fieldIds = new Array(numElements);
  for (let i = 0; i < numElements; i++) {
    fieldIds[i] = readUnsigned(reader, idWidth);
  }
  const offsets = new Array(numElements + 1);
  for (let i = 0; i < offsets.length; i++) {
    offsets[i] = readUnsigned(reader, offsetWidth);
  }
  const out = {};
  for (let i = 0; i < numElements; i++) {
    const key = metadata.dictionary[fieldIds[i]];
    const valueReader = {
      view: reader.view,
      offset: reader.offset + offsets[i]
    };
    out[key] = readVariant(valueReader, metadata, parsers);
  }
  reader.offset += offsets[offsets.length - 1];
  return out;
}
function readVariantArray(reader, header, metadata, parsers) {
  const fieldOffsetSize = header & 3;
  const isLarge = header >> 2 & 1;
  const offsetWidth = fieldOffsetSize + 1;
  const numElements = readUnsigned(reader, isLarge ? 4 : 1);
  const offsets = new Array(numElements + 1);
  for (let i = 0; i < offsets.length; i++) {
    offsets[i] = readUnsigned(reader, offsetWidth);
  }
  const valuesStart = reader.offset;
  const result = new Array(numElements);
  for (let i = 0; i < numElements; i++) {
    const valueReader = {
      view: reader.view,
      offset: valuesStart + offsets[i]
    };
    result[i] = readVariant(valueReader, metadata, parsers);
  }
  reader.offset = valuesStart + offsets[offsets.length - 1];
  return result;
}
function readVariantDecimal(reader, width) {
  const scale = reader.view.getUint8(reader.offset);
  reader.offset += 1;
  let unscaled;
  if (width === 4) {
    unscaled = BigInt(reader.view.getInt32(reader.offset, true));
    reader.offset += 4;
  } else if (width === 8) {
    unscaled = reader.view.getBigInt64(reader.offset, true);
    reader.offset += 8;
  } else {
    const low = reader.view.getBigUint64(reader.offset, true);
    const high = reader.view.getBigInt64(reader.offset + 8, true);
    unscaled = high << 64n | low;
    reader.offset += 16;
  }
  return Number(unscaled) * 10 ** -scale;
}
function readVariantBinary(reader) {
  const length = reader.view.getUint32(reader.offset, true);
  reader.offset += 4;
  const bytes = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, length);
  reader.offset += length;
  return bytes;
}

// node_modules/hyparquet/src/assemble.js
function assembleLists(output, definitionLevels, repetitionLevels, values, schemaPath) {
  const maxDefinitionLevel = getMaxDefinitionLevel(schemaPath);
  if (!definitionLevels?.length && !repetitionLevels.length) {
    if (!maxDefinitionLevel || !values.length) return values;
    definitionLevels = new Array(values.length).fill(maxDefinitionLevel);
  }
  const n = definitionLevels?.length || repetitionLevels.length;
  const repetitionPath = schemaPath.map(({ element }) => element.repetition_type);
  let valueIndex = 0;
  const containerStack = [output];
  let currentContainer = output;
  let currentDepth = 0;
  let currentDefLevel = 0;
  let currentRepLevel = 0;
  if (repetitionLevels[0]) {
    while (currentDepth < repetitionPath.length - 2 && currentRepLevel < repetitionLevels[0]) {
      currentDepth++;
      if (repetitionPath[currentDepth] !== "REQUIRED") {
        currentContainer = currentContainer.at(-1);
        containerStack.push(currentContainer);
        currentDefLevel++;
      }
      if (repetitionPath[currentDepth] === "REPEATED") currentRepLevel++;
    }
  }
  for (let i = 0; i < n; i++) {
    const def = definitionLevels?.length ? definitionLevels[i] : maxDefinitionLevel;
    const rep = repetitionLevels[i];
    while (currentDepth && (rep < currentRepLevel || repetitionPath[currentDepth] !== "REPEATED")) {
      if (repetitionPath[currentDepth] !== "REQUIRED") {
        containerStack.pop();
        currentDefLevel--;
      }
      if (repetitionPath[currentDepth] === "REPEATED") currentRepLevel--;
      currentDepth--;
    }
    currentContainer = containerStack.at(-1);
    while ((currentDepth < repetitionPath.length - 2 || repetitionPath[currentDepth + 1] === "REPEATED") && (currentDefLevel < def || repetitionPath[currentDepth + 1] === "REQUIRED")) {
      currentDepth++;
      if (repetitionPath[currentDepth] !== "REQUIRED") {
        const newList = [];
        currentContainer.push(newList);
        currentContainer = newList;
        containerStack.push(newList);
        currentDefLevel++;
      }
      if (repetitionPath[currentDepth] === "REPEATED") currentRepLevel++;
    }
    if (def === maxDefinitionLevel) {
      currentContainer.push(values[valueIndex++]);
    } else if (currentDepth === repetitionPath.length - 2) {
      currentContainer.push(null);
    } else {
      currentContainer.push([]);
    }
  }
  if (!output.length) {
    for (let i = 0; i < maxDefinitionLevel; i++) {
      const newList = [];
      currentContainer.push(newList);
      currentContainer = newList;
    }
  }
  return output;
}
function assembleNested(subcolumnData, schema, parsers, depth = 0) {
  const path = schema.path.join(".");
  const optional = schema.element.repetition_type === "OPTIONAL";
  const nextDepth = optional ? depth + 1 : depth;
  if (isListLike(schema)) {
    let sublist = schema.children[0];
    let subDepth = nextDepth;
    if (sublist.children.length === 1) {
      sublist = sublist.children[0];
      subDepth++;
    }
    assembleNested(subcolumnData, sublist, parsers, subDepth);
    const subcolumn = sublist.path.join(".");
    const values = subcolumnData.get(subcolumn);
    if (!values) throw new Error("parquet list column missing values");
    if (optional) flattenAtDepth(values, depth);
    subcolumnData.set(path, values);
    subcolumnData.delete(subcolumn);
    return;
  }
  if (isMapLike(schema)) {
    const mapName = schema.children[0].element.name;
    assembleNested(subcolumnData, schema.children[0].children[0], parsers, nextDepth + 1);
    assembleNested(subcolumnData, schema.children[0].children[1], parsers, nextDepth + 1);
    const keys = subcolumnData.get(`${path}.${mapName}.key`);
    const values = subcolumnData.get(`${path}.${mapName}.value`);
    if (!keys) throw new Error("parquet map column missing keys");
    if (!values) throw new Error("parquet map column missing values");
    if (keys.length !== values.length) {
      throw new Error("parquet map column key/value length mismatch");
    }
    const out = assembleMaps(keys, values, nextDepth);
    if (optional) flattenAtDepth(out, depth);
    subcolumnData.delete(`${path}.${mapName}.key`);
    subcolumnData.delete(`${path}.${mapName}.value`);
    subcolumnData.set(path, out);
    return;
  }
  if (schema.children.length) {
    const invertDepth = schema.element.repetition_type === "REQUIRED" ? depth : depth + 1;
    const struct = {};
    for (const child of schema.children) {
      assembleNested(subcolumnData, child, parsers, invertDepth);
      const childData = subcolumnData.get(child.path.join("."));
      if (!childData) throw new Error("parquet struct missing child data");
      struct[child.element.name] = childData;
    }
    for (const child of schema.children) {
      subcolumnData.delete(child.path.join("."));
    }
    let inverted = invertStruct(struct, invertDepth);
    if (schema.element.logical_type?.type === "VARIANT") {
      inverted = decodeVariantColumn(inverted, parsers);
    }
    if (optional) flattenAtDepth(inverted, depth);
    subcolumnData.set(path, inverted);
  }
}
function flattenAtDepth(arr, depth) {
  for (let i = 0; i < arr.length; i++) {
    if (depth) {
      flattenAtDepth(arr[i], depth - 1);
    } else {
      arr[i] = arr[i][0];
    }
  }
}
function assembleMaps(keys, values, depth) {
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    if (depth) {
      out.push(assembleMaps(keys[i], values[i], depth - 1));
    } else {
      if (keys[i]) {
        const obj = {};
        for (let j = 0; j < keys[i].length; j++) {
          const value = values[i][j];
          obj[keys[i][j]] = value === void 0 ? null : value;
        }
        out.push(obj);
      } else {
        out.push(void 0);
      }
    }
  }
  return out;
}
function invertStruct(struct, depth) {
  const keys = Object.keys(struct);
  const length = struct[keys[0]]?.length;
  const out = [];
  for (let i = 0; i < length; i++) {
    const obj = {};
    for (const key of keys) {
      if (struct[key].length !== length) throw new Error("parquet struct parsing error");
      obj[key] = struct[key][i];
    }
    if (depth) {
      out.push(invertStruct(obj, depth - 1));
    } else {
      out.push(obj);
    }
  }
  return out;
}

// node_modules/hyparquet/src/delta.js
function deltaBinaryUnpack(reader, count, output) {
  const int32 = output instanceof Int32Array;
  const blockSize = readVarInt(reader);
  const miniblockPerBlock = readVarInt(reader);
  readVarInt(reader);
  let value = readZigZagBigInt(reader);
  let outputIndex = 0;
  output[outputIndex++] = int32 ? Number(value) : value;
  const valuesPerMiniblock = blockSize / miniblockPerBlock;
  while (outputIndex < count) {
    const minDelta = readZigZagBigInt(reader);
    const bitWidths = new Uint8Array(miniblockPerBlock);
    for (let i = 0; i < miniblockPerBlock; i++) {
      bitWidths[i] = reader.view.getUint8(reader.offset++);
    }
    for (let i = 0; i < miniblockPerBlock && outputIndex < count; i++) {
      const bitWidth2 = BigInt(bitWidths[i]);
      if (bitWidth2) {
        let bitpackPos = 0n;
        let miniblockCount = valuesPerMiniblock;
        const mask = (1n << bitWidth2) - 1n;
        while (miniblockCount && outputIndex < count) {
          let bits2 = BigInt(reader.view.getUint8(reader.offset)) >> bitpackPos & mask;
          bitpackPos += bitWidth2;
          while (bitpackPos >= 8) {
            bitpackPos -= 8n;
            reader.offset++;
            if (bitpackPos) {
              bits2 |= BigInt(reader.view.getUint8(reader.offset)) << bitWidth2 - bitpackPos & mask;
            }
          }
          const delta = minDelta + bits2;
          value += delta;
          output[outputIndex++] = int32 ? Number(value) : value;
          miniblockCount--;
        }
        if (miniblockCount) {
          reader.offset += Math.ceil((miniblockCount * Number(bitWidth2) + Number(bitpackPos)) / 8);
        }
      } else {
        for (let j = 0; j < valuesPerMiniblock && outputIndex < count; j++) {
          value += minDelta;
          output[outputIndex++] = int32 ? Number(value) : value;
        }
      }
    }
  }
}
function deltaLengthByteArray(reader, count, output) {
  const lengths = new Int32Array(count);
  deltaBinaryUnpack(reader, count, lengths);
  for (let i = 0; i < count; i++) {
    output[i] = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, lengths[i]);
    reader.offset += lengths[i];
  }
}
function deltaByteArray(reader, count, output) {
  const prefixData = new Int32Array(count);
  deltaBinaryUnpack(reader, count, prefixData);
  const suffixData = new Int32Array(count);
  deltaBinaryUnpack(reader, count, suffixData);
  for (let i = 0; i < count; i++) {
    const suffix = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, suffixData[i]);
    if (prefixData[i]) {
      output[i] = new Uint8Array(prefixData[i] + suffixData[i]);
      output[i].set(output[i - 1].subarray(0, prefixData[i]));
      output[i].set(suffix, prefixData[i]);
    } else {
      output[i] = suffix;
    }
    reader.offset += suffixData[i];
  }
}

// node_modules/hyparquet/src/encoding.js
function readRleBitPackedHybrid(reader, width, output, length) {
  if (length === void 0) {
    length = reader.view.getUint32(reader.offset, true);
    reader.offset += 4;
  }
  const startOffset = reader.offset;
  let seen = 0;
  while (seen < output.length) {
    const header = readVarInt(reader);
    if (header & 1) {
      seen = readBitPacked(reader, header, width, output, seen);
    } else {
      const count = header >>> 1;
      readRle(reader, count, width, output, seen);
      seen += count;
    }
  }
  reader.offset = startOffset + length;
}
function readRle(reader, count, bitWidth2, output, seen) {
  const width = bitWidth2 + 7 >> 3;
  let value = 0;
  for (let i = 0; i < width; i++) {
    value |= reader.view.getUint8(reader.offset++) << (i << 3);
  }
  for (let i = 0; i < count; i++) {
    output[seen + i] = value;
  }
}
function readBitPacked(reader, header, bitWidth2, output, seen) {
  let count = header >> 1 << 3;
  const mask = (1 << bitWidth2) - 1;
  let data = 0;
  if (reader.offset < reader.view.byteLength) {
    data = reader.view.getUint8(reader.offset++);
  } else if (mask) {
    throw new Error(`parquet bitpack offset ${reader.offset} out of range`);
  }
  let left = 8;
  let right = 0;
  while (count) {
    if (right > 8) {
      right -= 8;
      left -= 8;
      data >>>= 8;
    } else if (left - right < bitWidth2) {
      data |= reader.view.getUint8(reader.offset) << left;
      reader.offset++;
      left += 8;
    } else {
      if (seen < output.length) {
        output[seen++] = data >> right & mask;
      }
      count--;
      right += bitWidth2;
    }
  }
  return seen;
}
function byteStreamSplit(reader, count, type, typeLength) {
  const width = byteWidth(type, typeLength);
  const bytes = new Uint8Array(count * width);
  for (let b = 0; b < width; b++) {
    for (let i = 0; i < count; i++) {
      bytes[i * width + b] = reader.view.getUint8(reader.offset++);
    }
  }
  if (type === "FLOAT") return new Float32Array(bytes.buffer);
  else if (type === "DOUBLE") return new Float64Array(bytes.buffer);
  else if (type === "INT32") return new Int32Array(bytes.buffer);
  else if (type === "INT64") return new BigInt64Array(bytes.buffer);
  else if (type === "FIXED_LEN_BYTE_ARRAY") {
    const split = new Array(count);
    for (let i = 0; i < count; i++) {
      split[i] = bytes.subarray(i * width, (i + 1) * width);
    }
    return split;
  }
  throw new Error(`parquet byte_stream_split unsupported type: ${type}`);
}
function byteWidth(type, typeLength) {
  switch (type) {
    case "INT32":
    case "FLOAT":
      return 4;
    case "INT64":
    case "DOUBLE":
      return 8;
    case "FIXED_LEN_BYTE_ARRAY":
      if (!typeLength) throw new Error("parquet byteWidth missing type_length");
      return typeLength;
    default:
      throw new Error(`parquet unsupported type: ${type}`);
  }
}

// node_modules/hyparquet/src/plain.js
function readPlain(reader, type, count, fixedLength) {
  if (count === 0) return [];
  if (type === "BOOLEAN") {
    return readPlainBoolean(reader, count);
  } else if (type === "INT32") {
    return readPlainInt32(reader, count);
  } else if (type === "INT64") {
    return readPlainInt64(reader, count);
  } else if (type === "INT96") {
    return readPlainInt96(reader, count);
  } else if (type === "FLOAT") {
    return readPlainFloat(reader, count);
  } else if (type === "DOUBLE") {
    return readPlainDouble(reader, count);
  } else if (type === "BYTE_ARRAY") {
    return readPlainByteArray(reader, count);
  } else if (type === "FIXED_LEN_BYTE_ARRAY") {
    if (!fixedLength) throw new Error("parquet missing fixed length");
    return readPlainByteArrayFixed(reader, count, fixedLength);
  } else {
    throw new Error(`parquet unhandled type: ${type}`);
  }
}
function readPlainBoolean(reader, count) {
  const values = new Array(count);
  for (let i = 0; i < count; i++) {
    const byteOffset = reader.offset + (i / 8 | 0);
    const bitOffset = i % 8;
    const byte = reader.view.getUint8(byteOffset);
    values[i] = (byte & 1 << bitOffset) !== 0;
  }
  reader.offset += Math.ceil(count / 8);
  return values;
}
function readPlainInt32(reader, count) {
  const values = (reader.view.byteOffset + reader.offset) % 4 ? new Int32Array(align(reader.view.buffer, reader.view.byteOffset + reader.offset, count * 4)) : new Int32Array(reader.view.buffer, reader.view.byteOffset + reader.offset, count);
  reader.offset += count * 4;
  return values;
}
function readPlainInt64(reader, count) {
  const values = (reader.view.byteOffset + reader.offset) % 8 ? new BigInt64Array(align(reader.view.buffer, reader.view.byteOffset + reader.offset, count * 8)) : new BigInt64Array(reader.view.buffer, reader.view.byteOffset + reader.offset, count);
  reader.offset += count * 8;
  return values;
}
function readPlainInt96(reader, count) {
  const values = new Array(count);
  for (let i = 0; i < count; i++) {
    const low = reader.view.getBigInt64(reader.offset + i * 12, true);
    const high = reader.view.getInt32(reader.offset + i * 12 + 8, true);
    values[i] = BigInt(high) << 64n | low;
  }
  reader.offset += count * 12;
  return values;
}
function readPlainFloat(reader, count) {
  const values = (reader.view.byteOffset + reader.offset) % 4 ? new Float32Array(align(reader.view.buffer, reader.view.byteOffset + reader.offset, count * 4)) : new Float32Array(reader.view.buffer, reader.view.byteOffset + reader.offset, count);
  reader.offset += count * 4;
  return values;
}
function readPlainDouble(reader, count) {
  const values = (reader.view.byteOffset + reader.offset) % 8 ? new Float64Array(align(reader.view.buffer, reader.view.byteOffset + reader.offset, count * 8)) : new Float64Array(reader.view.buffer, reader.view.byteOffset + reader.offset, count);
  reader.offset += count * 8;
  return values;
}
function readPlainByteArray(reader, count) {
  const values = new Array(count);
  for (let i = 0; i < count; i++) {
    const length = reader.view.getUint32(reader.offset, true);
    reader.offset += 4;
    values[i] = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, length);
    reader.offset += length;
  }
  return values;
}
function readPlainByteArrayFixed(reader, count, fixedLength) {
  const values = new Array(count);
  for (let i = 0; i < count; i++) {
    values[i] = new Uint8Array(reader.view.buffer, reader.view.byteOffset + reader.offset, fixedLength);
    reader.offset += fixedLength;
  }
  return values;
}
function align(buffer, offset, size) {
  const aligned = new ArrayBuffer(size);
  new Uint8Array(aligned).set(new Uint8Array(buffer, offset, size));
  return aligned;
}

// node_modules/hyparquet/src/snappy.js
var WORD_MASK = [0, 255, 65535, 16777215, 4294967295];
function copyBytes(fromArray, fromPos, toArray2, toPos, length) {
  for (let i = 0; i < length; i++) {
    toArray2[toPos + i] = fromArray[fromPos + i];
  }
}
function snappyUncompress(input, output) {
  const inputLength = input.byteLength;
  const outputLength = output.byteLength;
  let pos = 0;
  let outPos = 0;
  while (pos < inputLength) {
    const c = input[pos];
    pos++;
    if (c < 128) {
      break;
    }
  }
  if (outputLength && pos >= inputLength) {
    throw new Error("invalid snappy length header");
  }
  while (pos < inputLength) {
    const c = input[pos];
    let len = 0;
    pos++;
    if (pos >= inputLength) {
      throw new Error("missing eof marker");
    }
    if ((c & 3) === 0) {
      let len2 = (c >>> 2) + 1;
      if (len2 > 60) {
        if (pos + 3 >= inputLength) {
          throw new Error("snappy error literal pos + 3 >= inputLength");
        }
        const lengthSize = len2 - 60;
        len2 = input[pos] + (input[pos + 1] << 8) + (input[pos + 2] << 16) + (input[pos + 3] << 24);
        len2 = (len2 & WORD_MASK[lengthSize]) + 1;
        pos += lengthSize;
      }
      if (pos + len2 > inputLength) {
        throw new Error("snappy error literal exceeds input length");
      }
      copyBytes(input, pos, output, outPos, len2);
      pos += len2;
      outPos += len2;
    } else {
      let offset = 0;
      switch (c & 3) {
        case 1:
          len = (c >>> 2 & 7) + 4;
          offset = input[pos] + (c >>> 5 << 8);
          pos++;
          break;
        case 2:
          if (inputLength <= pos + 1) {
            throw new Error("snappy error end of input");
          }
          len = (c >>> 2) + 1;
          offset = input[pos] + (input[pos + 1] << 8);
          pos += 2;
          break;
        case 3:
          if (inputLength <= pos + 3) {
            throw new Error("snappy error end of input");
          }
          len = (c >>> 2) + 1;
          offset = input[pos] + (input[pos + 1] << 8) + (input[pos + 2] << 16) + (input[pos + 3] << 24);
          pos += 4;
          break;
        default:
          break;
      }
      if (offset === 0 || isNaN(offset)) {
        throw new Error(`invalid offset ${offset} pos ${pos} inputLength ${inputLength}`);
      }
      if (offset > outPos) {
        throw new Error("cannot copy from before start of buffer");
      }
      copyBytes(output, outPos - offset, output, outPos, len);
      outPos += len;
    }
  }
  if (outPos !== outputLength) throw new Error("premature end of input");
}

// node_modules/hyparquet/src/datapage.js
function readDataPage(bytes, daph, { type, element, schemaPath }) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const reader = { view, offset: 0 };
  let dataPage;
  const repetitionLevels = readRepetitionLevels(reader, daph, schemaPath);
  const { definitionLevels, numNulls } = readDefinitionLevels(reader, daph, schemaPath);
  const nValues = daph.num_values - numNulls;
  if (daph.encoding === "PLAIN") {
    dataPage = readPlain(reader, type, nValues, element.type_length);
  } else if (daph.encoding === "PLAIN_DICTIONARY" || daph.encoding === "RLE_DICTIONARY" || daph.encoding === "RLE") {
    const bitWidth2 = type === "BOOLEAN" ? 1 : view.getUint8(reader.offset++);
    if (bitWidth2) {
      dataPage = new Array(nValues);
      if (type === "BOOLEAN") {
        readRleBitPackedHybrid(reader, bitWidth2, dataPage);
        dataPage = dataPage.map((x) => !!x);
      } else {
        readRleBitPackedHybrid(reader, bitWidth2, dataPage, view.byteLength - reader.offset);
      }
    } else {
      dataPage = new Uint8Array(nValues);
    }
  } else if (daph.encoding === "BYTE_STREAM_SPLIT") {
    dataPage = byteStreamSplit(reader, nValues, type, element.type_length);
  } else if (daph.encoding === "DELTA_BINARY_PACKED") {
    const int32 = type === "INT32";
    dataPage = int32 ? new Int32Array(nValues) : new BigInt64Array(nValues);
    deltaBinaryUnpack(reader, nValues, dataPage);
  } else if (daph.encoding === "DELTA_LENGTH_BYTE_ARRAY") {
    dataPage = new Array(nValues);
    deltaLengthByteArray(reader, nValues, dataPage);
  } else {
    throw new Error(`parquet unsupported encoding: ${daph.encoding}`);
  }
  return { definitionLevels, repetitionLevels, dataPage };
}
function readRepetitionLevels(reader, daph, schemaPath) {
  if (schemaPath.length > 1) {
    const maxRepetitionLevel = getMaxRepetitionLevel(schemaPath);
    if (maxRepetitionLevel) {
      const values = new Array(daph.num_values);
      readRleBitPackedHybrid(reader, bitWidth(maxRepetitionLevel), values);
      return values;
    }
  }
  return [];
}
function readDefinitionLevels(reader, daph, schemaPath) {
  const maxDefinitionLevel = getMaxDefinitionLevel(schemaPath);
  if (!maxDefinitionLevel) return { definitionLevels: [], numNulls: 0 };
  const definitionLevels = new Array(daph.num_values);
  readRleBitPackedHybrid(reader, bitWidth(maxDefinitionLevel), definitionLevels);
  let numNulls = daph.num_values;
  for (const def of definitionLevels) {
    if (def === maxDefinitionLevel) numNulls--;
  }
  if (numNulls === 0) definitionLevels.length = 0;
  return { definitionLevels, numNulls };
}
function decompressPage(compressedBytes, uncompressed_page_size, codec, compressors) {
  let page;
  const customDecompressor = compressors?.[codec];
  if (codec === "UNCOMPRESSED") {
    page = compressedBytes;
  } else if (customDecompressor) {
    page = customDecompressor(compressedBytes, uncompressed_page_size);
  } else if (codec === "SNAPPY") {
    page = new Uint8Array(uncompressed_page_size);
    snappyUncompress(compressedBytes, page);
  } else {
    throw new Error(`parquet unsupported compression codec: ${codec}`);
  }
  if (page?.length !== uncompressed_page_size) {
    throw new Error(`parquet decompressed page length ${page?.length} does not match header ${uncompressed_page_size}`);
  }
  return page;
}
function readDataPageV2(compressedBytes, ph, columnDecoder) {
  const view = new DataView(compressedBytes.buffer, compressedBytes.byteOffset, compressedBytes.byteLength);
  const reader = { view, offset: 0 };
  const { type, element, schemaPath, codec, compressors } = columnDecoder;
  const daph2 = ph.data_page_header_v2;
  if (!daph2) throw new Error("parquet data page header v2 is undefined");
  const repetitionLevels = readRepetitionLevelsV2(reader, daph2, schemaPath);
  reader.offset = daph2.repetition_levels_byte_length;
  const definitionLevels = readDefinitionLevelsV2(reader, daph2, schemaPath);
  const uncompressedPageSize = ph.uncompressed_page_size - daph2.definition_levels_byte_length - daph2.repetition_levels_byte_length;
  let page = compressedBytes.subarray(reader.offset);
  if (daph2.is_compressed !== false) {
    page = decompressPage(page, uncompressedPageSize, codec, compressors);
  }
  const pageView = new DataView(page.buffer, page.byteOffset, page.byteLength);
  const pageReader = { view: pageView, offset: 0 };
  let dataPage;
  const nValues = daph2.num_values - daph2.num_nulls;
  if (daph2.encoding === "PLAIN") {
    dataPage = readPlain(pageReader, type, nValues, element.type_length);
  } else if (daph2.encoding === "RLE") {
    dataPage = new Array(nValues);
    readRleBitPackedHybrid(pageReader, 1, dataPage);
    dataPage = dataPage.map((x) => !!x);
  } else if (daph2.encoding === "PLAIN_DICTIONARY" || daph2.encoding === "RLE_DICTIONARY") {
    const bitWidth2 = pageView.getUint8(pageReader.offset++);
    dataPage = new Array(nValues);
    readRleBitPackedHybrid(pageReader, bitWidth2, dataPage, uncompressedPageSize - 1);
  } else if (daph2.encoding === "DELTA_BINARY_PACKED") {
    const int32 = type === "INT32";
    dataPage = int32 ? new Int32Array(nValues) : new BigInt64Array(nValues);
    deltaBinaryUnpack(pageReader, nValues, dataPage);
  } else if (daph2.encoding === "DELTA_LENGTH_BYTE_ARRAY") {
    dataPage = new Array(nValues);
    deltaLengthByteArray(pageReader, nValues, dataPage);
  } else if (daph2.encoding === "DELTA_BYTE_ARRAY") {
    dataPage = new Array(nValues);
    deltaByteArray(pageReader, nValues, dataPage);
  } else if (daph2.encoding === "BYTE_STREAM_SPLIT") {
    dataPage = byteStreamSplit(pageReader, nValues, type, element.type_length);
  } else {
    throw new Error(`parquet unsupported encoding: ${daph2.encoding}`);
  }
  return { definitionLevels, repetitionLevels, dataPage };
}
function readRepetitionLevelsV2(reader, daph2, schemaPath) {
  const maxRepetitionLevel = getMaxRepetitionLevel(schemaPath);
  if (!maxRepetitionLevel) return [];
  const values = new Array(daph2.num_values);
  readRleBitPackedHybrid(reader, bitWidth(maxRepetitionLevel), values, daph2.repetition_levels_byte_length);
  return values;
}
function readDefinitionLevelsV2(reader, daph2, schemaPath) {
  const maxDefinitionLevel = getMaxDefinitionLevel(schemaPath);
  if (maxDefinitionLevel) {
    const values = new Array(daph2.num_values);
    readRleBitPackedHybrid(reader, bitWidth(maxDefinitionLevel), values, daph2.definition_levels_byte_length);
    return values;
  }
}
function bitWidth(value) {
  return 32 - Math.clz32(value);
}

// node_modules/hyparquet/src/column.js
function readColumn(reader, { groupStart, selectStart, selectEnd }, columnDecoder, onPage) {
  const { pathInSchema, schemaPath } = columnDecoder;
  const isFlat = isFlatColumn(schemaPath);
  const chunks = [];
  let dictionary = void 0;
  let lastChunk = void 0;
  let rowCount = 0;
  let skipped = 0;
  const emitLastChunk = onPage && (() => {
    lastChunk && onPage({
      pathInSchema,
      columnData: lastChunk,
      rowStart: groupStart + rowCount - lastChunk.length,
      rowEnd: groupStart + rowCount
    });
  });
  while (isFlat ? rowCount < selectEnd : reader.offset < reader.view.byteLength - 1) {
    if (reader.offset >= reader.view.byteLength - 1) break;
    const header = parquetHeader(reader);
    if (header.type === "DICTIONARY_PAGE") {
      const { data } = readPage(reader, header, columnDecoder, dictionary, void 0, 0);
      if (data) dictionary = convert(data, columnDecoder);
    } else {
      const lastChunkLength = lastChunk?.length || 0;
      const result = readPage(reader, header, columnDecoder, dictionary, lastChunk, selectStart - rowCount);
      if (result.skipped) {
        if (!chunks.length) {
          skipped += result.skipped;
        }
        rowCount += result.skipped;
      } else if (result.data && lastChunk === result.data) {
        rowCount += result.data.length - lastChunkLength;
      } else if (result.data && result.data.length) {
        emitLastChunk?.();
        chunks.push(result.data);
        rowCount += result.data.length;
        lastChunk = result.data;
      }
    }
  }
  emitLastChunk?.();
  return { data: chunks, skipped };
}
function readPage(reader, header, columnDecoder, dictionary, previousChunk, pageStart) {
  const { type, element, schemaPath, codec, compressors } = columnDecoder;
  const compressedBytes = new Uint8Array(
    reader.view.buffer,
    reader.view.byteOffset + reader.offset,
    header.compressed_page_size
  );
  reader.offset += header.compressed_page_size;
  if (header.type === "DATA_PAGE") {
    const daph = header.data_page_header;
    if (!daph) throw new Error("parquet data page header is undefined");
    if (pageStart > daph.num_values && isFlatColumn(schemaPath)) {
      return { skipped: daph.num_values };
    }
    const page = decompressPage(compressedBytes, Number(header.uncompressed_page_size), codec, compressors);
    const { definitionLevels, repetitionLevels, dataPage } = readDataPage(page, daph, columnDecoder);
    const values = convertWithDictionary(dataPage, dictionary, daph.encoding, columnDecoder);
    const output = Array.isArray(previousChunk) ? previousChunk : [];
    const assembled = assembleLists(output, definitionLevels, repetitionLevels, values, schemaPath);
    return { skipped: 0, data: assembled };
  } else if (header.type === "DATA_PAGE_V2") {
    const daph2 = header.data_page_header_v2;
    if (!daph2) throw new Error("parquet data page header v2 is undefined");
    if (pageStart > daph2.num_rows) {
      return { skipped: daph2.num_values };
    }
    const { definitionLevels, repetitionLevels, dataPage } = readDataPageV2(compressedBytes, header, columnDecoder);
    const values = convertWithDictionary(dataPage, dictionary, daph2.encoding, columnDecoder);
    const output = Array.isArray(previousChunk) ? previousChunk : [];
    const assembled = assembleLists(output, definitionLevels, repetitionLevels, values, schemaPath);
    return { skipped: 0, data: assembled };
  } else if (header.type === "DICTIONARY_PAGE") {
    const diph = header.dictionary_page_header;
    if (!diph) throw new Error("parquet dictionary page header is undefined");
    const page = decompressPage(
      compressedBytes,
      Number(header.uncompressed_page_size),
      codec,
      compressors
    );
    const reader2 = { view: new DataView(page.buffer, page.byteOffset, page.byteLength), offset: 0 };
    const dictArray = readPlain(reader2, type, diph.num_values, element.type_length);
    return { skipped: 0, data: dictArray };
  } else {
    throw new Error(`parquet unsupported page type: ${header.type}`);
  }
}
function parquetHeader(reader) {
  const header = deserializeTCompactProtocol(reader);
  const type = PageTypes[header.field_1];
  const uncompressed_page_size = header.field_2;
  const compressed_page_size = header.field_3;
  const crc = header.field_4;
  const data_page_header = header.field_5 && {
    num_values: header.field_5.field_1,
    encoding: Encodings[header.field_5.field_2],
    definition_level_encoding: Encodings[header.field_5.field_3],
    repetition_level_encoding: Encodings[header.field_5.field_4],
    statistics: header.field_5.field_5 && {
      max: header.field_5.field_5.field_1,
      min: header.field_5.field_5.field_2,
      null_count: header.field_5.field_5.field_3,
      distinct_count: header.field_5.field_5.field_4,
      max_value: header.field_5.field_5.field_5,
      min_value: header.field_5.field_5.field_6
    }
  };
  const index_page_header = header.field_6;
  const dictionary_page_header = header.field_7 && {
    num_values: header.field_7.field_1,
    encoding: Encodings[header.field_7.field_2],
    is_sorted: header.field_7.field_3
  };
  const data_page_header_v2 = header.field_8 && {
    num_values: header.field_8.field_1,
    num_nulls: header.field_8.field_2,
    num_rows: header.field_8.field_3,
    encoding: Encodings[header.field_8.field_4],
    definition_levels_byte_length: header.field_8.field_5,
    repetition_levels_byte_length: header.field_8.field_6,
    is_compressed: header.field_8.field_7 === void 0 ? true : header.field_8.field_7,
    // default true
    statistics: header.field_8.field_8
  };
  return {
    type,
    uncompressed_page_size,
    compressed_page_size,
    crc,
    data_page_header,
    index_page_header,
    dictionary_page_header,
    data_page_header_v2
  };
}

// node_modules/hyparquet/src/rowgroup.js
function readRowGroup(options, { metadata }, groupPlan) {
  const asyncColumns = [];
  for (const chunk of groupPlan.chunks) {
    const { data_page_offset, dictionary_page_offset, path_in_schema: pathInSchema } = chunk.columnMetadata;
    const schemaPath = getSchemaPath(metadata.schema, pathInSchema);
    const columnDecoder = {
      pathInSchema,
      element: schemaPath[schemaPath.length - 1].element,
      schemaPath,
      parsers: { ...DEFAULT_PARSERS, ...options.parsers },
      ...options,
      ...chunk.columnMetadata
    };
    let { startByte, endByte } = chunk.range;
    if (!("offsetIndex" in chunk)) {
      asyncColumns.push({
        pathInSchema,
        data: Promise.resolve(options.file.slice(startByte, endByte)).then((buffer) => {
          const reader = { view: new DataView(buffer), offset: 0 };
          return readColumn(reader, groupPlan, columnDecoder, options.onPage);
        })
      });
      continue;
    }
    asyncColumns.push({
      pathInSchema,
      // fetch offset index
      data: Promise.resolve(options.file.slice(chunk.offsetIndex.startByte, chunk.offsetIndex.endByte)).then(async (arrayBuffer) => {
        const { selectStart, selectEnd } = groupPlan;
        const pages = readOffsetIndex({ view: new DataView(arrayBuffer), offset: 0 }).page_locations;
        let skipped = -1;
        const hasDict = dictionary_page_offset || data_page_offset < pages[0].offset;
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pageStart = Number(page.first_row_index);
          const pageEnd = i + 1 < pages.length ? Number(pages[i + 1].first_row_index) : groupPlan.groupRows;
          if (skipped < 0 && !hasDict && pageEnd > selectStart) {
            startByte = Number(page.offset);
            skipped = pageStart;
          }
          if (pageStart < selectEnd) {
            endByte = Number(page.offset) + page.compressed_page_size;
          }
        }
        if (skipped < 0) skipped = 0;
        const buffer = await options.file.slice(startByte, endByte);
        const reader = { view: new DataView(buffer), offset: 0 };
        const adjustedGroupPlan = skipped ? {
          ...groupPlan,
          groupStart: groupPlan.groupStart + skipped,
          selectStart: groupPlan.selectStart - skipped,
          selectEnd: groupPlan.selectEnd - skipped
        } : groupPlan;
        const { data, skipped: columnSkipped } = readColumn(reader, adjustedGroupPlan, columnDecoder, options.onPage);
        return {
          data,
          skipped: skipped + columnSkipped
        };
      })
    });
  }
  return { groupStart: groupPlan.groupStart, groupRows: groupPlan.groupRows, asyncColumns };
}
async function asyncGroupToRows({ asyncColumns }, selectStart, selectEnd, columns, rowFormat) {
  const asyncPages = await Promise.all(asyncColumns.map(
    (column) => column.data.then(({ skipped, data }) => ({ skipped, data: flatten(data) }))
  ));
  const selectCount = selectEnd - selectStart;
  if (rowFormat === "object") {
    const groupData2 = Array(selectCount);
    for (let selectRow = 0; selectRow < selectCount; selectRow++) {
      const rowData = {};
      for (let i = 0; i < asyncColumns.length; i++) {
        const { data, skipped } = asyncPages[i];
        rowData[asyncColumns[i].pathInSchema[0]] = data[selectStart + selectRow - skipped];
      }
      groupData2[selectRow] = rowData;
    }
    return groupData2;
  }
  const includedColumnNames = asyncColumns.map((child) => child.pathInSchema[0]).filter((name) => !columns || columns.includes(name));
  const columnOrder = columns ?? includedColumnNames;
  const columnIndexes = columnOrder.map((name) => asyncColumns.findIndex((column) => column.pathInSchema[0] === name));
  const groupData = Array(selectCount);
  for (let selectRow = 0; selectRow < selectCount; selectRow++) {
    const rowData = Array(asyncColumns.length);
    for (let i = 0; i < columnOrder.length; i++) {
      const colIdx = columnIndexes[i];
      if (colIdx < 0) throw new Error(`parquet column not found: ${columnOrder[i]}`);
      const { data, skipped } = asyncPages[colIdx];
      rowData[i] = data[selectStart + selectRow - skipped];
    }
    groupData[selectRow] = rowData;
  }
  return groupData;
}
function assembleAsync(asyncRowGroup, schemaTree2, parsers) {
  const { asyncColumns } = asyncRowGroup;
  parsers = { ...DEFAULT_PARSERS, ...parsers };
  const assembled = [];
  for (const child of schemaTree2.children) {
    if (child.children.length) {
      const childColumns = asyncColumns.filter((column) => column.pathInSchema[0] === child.element.name);
      if (!childColumns.length) continue;
      assembled.push({
        pathInSchema: child.path,
        data: (async () => {
          const resolved = await Promise.all(childColumns.map((c) => c.data));
          const subcolumnData = /* @__PURE__ */ new Map();
          let minLength = Infinity;
          for (let i = 0; i < childColumns.length; i++) {
            const flat = flatten(resolved[i].data);
            subcolumnData.set(childColumns[i].pathInSchema.join("."), flat);
            minLength = Math.min(minLength, flat.length);
          }
          for (const [key, value] of subcolumnData) {
            if (value.length > minLength) {
              subcolumnData.set(key, value.slice(0, minLength));
            }
          }
          assembleNested(subcolumnData, child, parsers);
          const assembled2 = subcolumnData.get(child.element.name);
          if (!assembled2) throw new Error("parquet column data not assembled");
          return { data: [assembled2], skipped: 0 };
        })()
      });
    } else {
      const asyncColumn = asyncColumns.find((column) => column.pathInSchema[0] === child.element.name);
      if (asyncColumn) assembled.push(asyncColumn);
    }
  }
  return { ...asyncRowGroup, asyncColumns: assembled };
}

// node_modules/hyparquet/src/read.js
async function parquetRead(options) {
  options.metadata ??= await parquetMetadataAsync(options.file, options);
  const { rowStart = 0, rowEnd, columns, onChunk, onComplete, rowFormat, filter, filterStrict = true } = options;
  if (filter && rowFormat !== "object") {
    throw new Error('parquet filter requires rowFormat: "object"');
  }
  const filterColumns = columnsNeededForFilter(filter);
  if (filterColumns.length) {
    const schemaColumns = parquetSchema(options.metadata).children.map((c) => c.element.name);
    const missingColumns = filterColumns.filter((c) => !schemaColumns.includes(c));
    if (missingColumns.length) {
      throw new Error(`parquet filter columns not found: ${missingColumns.join(", ")}`);
    }
  }
  let readColumns = columns;
  let requiresProjection = false;
  if (columns && filter) {
    const missingFilterColumns = filterColumns.filter((c) => !columns.includes(c));
    if (missingFilterColumns.length) {
      readColumns = [...columns, ...missingFilterColumns];
      requiresProjection = true;
    }
  }
  let readOptions = readColumns !== columns ? { ...options, columns: readColumns } : options;
  readOptions = await withBloomFilters(readOptions);
  const asyncGroups = parquetReadAsync(readOptions);
  if (!onComplete && !onChunk) {
    await awaitAllColumns(asyncGroups);
    return;
  }
  const schemaTree2 = parquetSchema(options.metadata);
  const assembled = asyncGroups.map((arg) => assembleAsync(arg, schemaTree2, options.parsers));
  if (onChunk) {
    for (const asyncGroup of assembled) {
      for (const asyncColumn of asyncGroup.asyncColumns) {
        asyncColumn.data.then(({ data, skipped }) => {
          let rowStart2 = asyncGroup.groupStart + skipped;
          for (const columnData of data) {
            onChunk({
              columnName: asyncColumn.pathInSchema[0],
              columnData,
              rowStart: rowStart2,
              rowEnd: rowStart2 + columnData.length
            });
            rowStart2 += columnData.length;
          }
        }, () => {
        });
      }
    }
  }
  if (onComplete) {
    await awaitAllColumns(assembled);
    const rows = [];
    for (const asyncGroup of assembled) {
      const selectStart = Math.max(rowStart - asyncGroup.groupStart, 0);
      const selectEnd = Math.min((rowEnd ?? Infinity) - asyncGroup.groupStart, asyncGroup.groupRows);
      const groupData = rowFormat === "object" ? await asyncGroupToRows(asyncGroup, selectStart, selectEnd, readColumns, "object") : await asyncGroupToRows(asyncGroup, selectStart, selectEnd, columns, "array");
      if (filter) {
        for (
          const row of
          /** @type {Record<string, any>[]} */
          groupData
        ) {
          if (matchFilter(row, filter, filterStrict)) {
            if (requiresProjection && columns) {
              for (const col of filterColumns) {
                if (!columns.includes(col)) delete row[col];
              }
            }
            rows.push(row);
          }
        }
      } else {
        concat(rows, groupData);
      }
    }
    onComplete(rows);
  } else {
    await awaitAllColumns(assembled);
  }
}
async function awaitAllColumns(asyncGroups) {
  const all = asyncGroups.flatMap((g) => g.asyncColumns.map((c) => c.data));
  const results = await Promise.allSettled(all);
  const failed = results.find((r) => r.status === "rejected");
  if (failed) throw failed.reason;
}
function parquetReadAsync(options) {
  if (!options.metadata) throw new Error("parquet requires metadata");
  const plan = parquetPlan(options);
  options.file = prefetchAsyncBuffer(options.file, plan);
  return plan.groups.map((groupPlan) => readRowGroup(options, plan, groupPlan));
}
async function withBloomFilters(options) {
  if (!options.useBloomFilters) return options;
  if (!options.filter || !options.metadata) return options;
  const schemaTree2 = parquetSchema(options.metadata);
  const schemaElements = {};
  for (const child of schemaTree2.children) schemaElements[child.element.name] = child.element;
  const bloomFiltersByGroup = await prefetchBloomFilters({
    file: options.file,
    metadata: options.metadata,
    filter: options.filter,
    filterStrict: options.filterStrict
  });
  return (
    /** @type {BaseParquetReadOptions} */
    { ...options, bloomFiltersByGroup, schemaElements }
  );
}
function parquetReadObjects(options) {
  return new Promise((onComplete, reject) => {
    parquetRead({
      ...options,
      rowFormat: "object",
      // force object output
      onComplete
    }).catch(reject);
  });
}

// node_modules/hyparquet/src/node.js
async function asyncBufferFromFile(filename) {
  const { size } = await fs.stat(filename);
  return {
    byteLength: size,
    slice(start, end) {
      const reader = createReadStream(filename, { start, end });
      return new Promise((resolve3, reject) => {
        const chunks = [];
        reader.on("data", (chunk) => chunks.push(chunk));
        reader.on("error", reject);
        reader.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve3(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        });
      });
    }
  };
}

// node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i = 0; i < 31; ++i) {
    b[i] = start += 1 << eb[i - 1];
  }
  var r = new i32(b[30]);
  for (var i = 1; i < 30; ++i) {
    for (var j = b[i]; j < b[i + 1]; ++j) {
      r[j] = j - b[i] << 5 | i;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = function(cd, mb, r) {
  var s = cd.length;
  var i = 0;
  var l = new u16(mb);
  for (; i < s; ++i) {
    if (cd[i])
      ++l[cd[i] - 1];
  }
  var le = new u16(mb);
  for (i = 1; i < mb; ++i) {
    le[i] = le[i - 1] + l[i - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        var sv = i << 4 | cd[i];
        var r_1 = mb - cd[i];
        var v = le[cd[i] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i = 0; i < s; ++i) {
      if (cd[i]) {
        co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
      }
    }
  }
  return co;
};
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i = 1; i < a.length; ++i) {
    if (a[i] > m)
      m = a[i];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i = 0; i < hcLen; ++i) {
          clt[clim[i]] = bits(dat, pos + i * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i = 0; i < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i = sym - 257, b = fleb[i];
          add = bits(dat, pos, (1 << b) - 1) + fl[i];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i = 0; ; ) {
    var c = d[i++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i + eb > d.length)
      return { s: r, r: slc(d, i - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | d[i++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | d[i++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i = 0; i < dat.length; i += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i = 0; i < c; ++i) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// src/xlsx.ts
var decoder4 = new TextDecoder("utf-8");
function xmlDecode(s) {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : void 0;
}
function colIndex(ref) {
  const letters = ref.replace(/[0-9]+$/, "");
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
}
function textFromRuns(xml) {
  let out = "";
  const re = /<t\b[^>]*\/>|<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] !== void 0) out += xmlDecode(m[1]);
  }
  return out;
}
function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const re = /<si\b[^>]*\/>|<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1] !== void 0 ? textFromRuns(m[1]) : "");
  }
  return out;
}
var BUILTIN_DATE_FMT = /* @__PURE__ */ new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
function looksLikeDateFmt(code) {
  const stripped = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "").replace(/\\./g, "");
  return /[ymdhs]/i.test(stripped);
}
function parseStyles(xml) {
  if (!xml) return { isDate: [] };
  const customDate = /* @__PURE__ */ new Map();
  const numFmts = xml.match(/<numFmt\b[^>]*\/?>/g) ?? [];
  for (const nf of numFmts) {
    const id = Number(attr(nf, "numFmtId"));
    const code = attr(nf, "formatCode");
    if (Number.isFinite(id) && code !== void 0) {
      customDate.set(id, looksLikeDateFmt(xmlDecode(code)));
    }
  }
  const isDate = [];
  const cellXfsBlock = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (cellXfsBlock) {
    const xfs = cellXfsBlock[1].match(/<xf\b[^>]*\/?>/g) ?? [];
    for (const xf of xfs) {
      const id = Number(attr(xf, "numFmtId") ?? "0");
      isDate.push(BUILTIN_DATE_FMT.has(id) || customDate.get(id) === true);
    }
  }
  return { isDate };
}
function serialToIso(serial, date1904) {
  const epochDiff = date1904 ? 24107 : 25569;
  const ms = Math.round((serial - epochDiff) * 86400 * 1e3);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(serial);
  const iso = d.toISOString();
  return Number.isInteger(serial) ? iso.slice(0, 10) : iso.replace(/\.\d{3}Z$/, "Z");
}
async function parseXlsx(path, opts = {}) {
  const { readFile: readFile2 } = await import("node:fs/promises");
  const buf = await readFile2(path);
  return parseXlsxBytes(new Uint8Array(buf), opts);
}
function parseXlsxBytes(bytes, opts = {}) {
  let files;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("Not a valid .xlsx file (could not unzip). .xls (legacy binary) is not supported.");
  }
  const text = (name) => {
    const f = files[name];
    return f ? decoder4.decode(f) : void 0;
  };
  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("Not a valid .xlsx workbook (missing xl/workbook.xml).");
  const date1904 = /date1904="(1|true)"/.test(workbook);
  const sheetTags = workbook.match(/<sheet\b[^>]*\/?>/g) ?? [];
  const sheets = sheetTags.map((t) => ({ name: attr(t, "name") ?? "", rid: attr(t, "r:id") ?? "" }));
  if (sheets.length === 0) throw new Error("Workbook has no sheets.");
  const sheetNames = sheets.map((s) => s.name);
  const rels = text("xl/_rels/workbook.xml.rels") ?? "";
  const relMap = /* @__PURE__ */ new Map();
  for (const r of rels.match(/<Relationship\b[^>]*\/?>/g) ?? []) {
    const id = attr(r, "Id");
    const target2 = attr(r, "Target");
    if (id && target2) relMap.set(id, target2.replace(/^\//, "").replace(/^xl\//, ""));
  }
  let chosen = sheets[0];
  if (opts.sheet) {
    const found = sheets.find((s) => s.name === opts.sheet);
    if (!found) {
      throw new Error(`Sheet "${opts.sheet}" not found. Available: ${sheetNames.join(", ")}`);
    }
    chosen = found;
  }
  let target = relMap.get(chosen.rid) ?? "worksheets/sheet1.xml";
  if (!target.startsWith("worksheets/") && !target.includes("/")) target = "worksheets/" + target;
  const sheetXml = text("xl/" + target) ?? text("xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new Error("Could not locate worksheet XML.");
  const shared = parseSharedStrings(text("xl/sharedStrings.xml"));
  const styles = parseStyles(text("xl/styles.xml"));
  const grid = [];
  const rowRe = /<row\b[^>]*\/>|<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  const limit = opts.limit ?? Infinity;
  let m;
  let maxCol = 0;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    if (grid.length > limit) break;
    const body = m[2] ?? "";
    const cells = [];
    const cellRe = /<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let c;
    while ((c = cellRe.exec(body)) !== null) {
      const attrs = c[1] ?? c[2] ?? "";
      const inner = c[3] ?? "";
      const ref = attr(attrs, "r");
      const ci = ref ? colIndex(ref) : cells.length;
      const t = attr(attrs, "t");
      let value = null;
      if (t === "inlineStr") {
        value = textFromRuns(inner);
      } else {
        const vm = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
        const raw = vm ? xmlDecode(vm[1]) : "";
        if (raw === "") {
          value = null;
        } else if (t === "s") {
          value = shared[Number(raw)] ?? "";
        } else if (t === "b") {
          value = raw === "1";
        } else if (t === "str" || t === "e") {
          value = raw;
        } else {
          const s = Number(attr(attrs, "s") ?? "-1");
          const num = Number(raw);
          if (s >= 0 && styles.isDate[s] && Number.isFinite(num)) {
            value = serialToIso(num, date1904);
          } else {
            value = Number.isFinite(num) ? num : raw;
          }
        }
      }
      cells[ci] = value;
      if (ci + 1 > maxCol) maxCol = ci + 1;
    }
    grid.push(cells);
  }
  if (grid.length === 0) return { rows: [], sheetNames, sheet: chosen.name };
  const header = grid[0];
  const names = [];
  const usedNames = /* @__PURE__ */ new Set();
  for (let i = 0; i < maxCol; i++) {
    const base2 = header[i] == null || String(header[i]).trim() === "" ? `column_${i + 1}` : String(header[i]).trim();
    let candidate = base2;
    let n = 2;
    while (usedNames.has(candidate)) candidate = `${base2}_${n++}`;
    usedNames.add(candidate);
    names.push(candidate);
  }
  const rows = [];
  for (let r = 1; r < grid.length && rows.length < limit; r++) {
    const cells = grid[r];
    const obj = {};
    let allEmpty = true;
    for (let i = 0; i < maxCol; i++) {
      const v = cells[i] ?? null;
      obj[names[i]] = v;
      if (v !== null && v !== "") allEmpty = false;
    }
    if (!allEmpty) rows.push(obj);
  }
  return { rows, sheetNames, sheet: chosen.name };
}

// src/parse.ts
async function parseFile(path, opts = {}) {
  const format = detectFormat(path, opts.format);
  const limit = opts.limit ?? Infinity;
  if (format === "parquet") {
    return parseParquet(path, limit);
  }
  if (format === "xlsx") {
    const { rows } = await parseXlsx(path, { sheet: opts.sheet, limit });
    const total = rows.length;
    let out = rows;
    let truncated = false;
    if (out.length > limit) {
      out = out.slice(0, limit);
      truncated = true;
    }
    return { rows: out, format: "xlsx", totalRowCount: total, truncated };
  }
  const text = await readFile(path, "utf8");
  return parseText(text, format, opts);
}
async function parseParquet(path, limit) {
  const file = await asyncBufferFromFile(path);
  const rowEnd = Number.isFinite(limit) ? limit : void 0;
  const rows = await parquetReadObjects({ file, rowEnd });
  return {
    rows: normalizeParquetRows(rows),
    format: "parquet",
    truncated: rowEnd !== void 0 && rows.length >= rowEnd
  };
}
function normalizeParquetRows(rows) {
  return rows.map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "bigint") out[k] = Number(v);
      else out[k] = v;
    }
    return out;
  });
}

// src/dataset.ts
async function buildDataset(path, opts = {}) {
  const { rows, format, totalRowCount, truncated } = await parseFile(path, opts);
  return datasetFromRows(rows, { format, source: path, totalRowCount, truncated });
}

// src/generated/viewer-assets.ts
var VIEWER_JS = '"use strict";(()=>{var s=window.__DATALOUPE__,d=(t,e=document)=>e.querySelector(t),c=t=>t.replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",\'"\':"&quot;"})[e]),k=t=>t==="integer"||t==="number",H=t=>t==="date"||t==="datetime";function v(t){if(!isFinite(t))return String(t);if(Number.isInteger(t)&&Math.abs(t)<1e15)return t.toLocaleString();let e=Math.abs(t);return e!==0&&(e<1e-4||e>=1e12)?t.toExponential(3):t.toLocaleString(void 0,{maximumFractionDigits:4})}function O(t,e){let n=new Date(t);if(isNaN(n.getTime()))return String(t);let o=n.toISOString();return e==="datetime"?o.replace("T"," ").replace(".000Z","Z"):o.slice(0,10)}function X(t,e){return t==null?"":k(e)?v(t):H(e)?O(t,e):e==="boolean"?t?"true":"false":String(t)}function E(t){if(t<1e3)return String(t);let e=["k","M","B","T"],n=-1,o=t;for(;o>=1e3&&n<e.length-1;)o/=1e3,n++;return o.toFixed(o<10?1:0)+e[n]}function Z(t,e,n,o,a){let i=t.counts.length,r=Math.max(...t.counts,1),l=i>40?0:1,f=e/i,C=a&&H(a)?p=>O(p,a):v,g="";for(let p=0;p<i;p++){let $=t.counts[p]/r*(n-2),A=p*f;g+=`<rect x="${(A+l).toFixed(2)}" y="${(n-$).toFixed(2)}" width="${Math.max(.5,f-l).toFixed(2)}" height="${$.toFixed(2)}" rx="0.5" fill="${o}"><title>${C(t.bins[p])} \\u2013 ${C(t.bins[p+1])}: ${t.counts[p]}</title></rect>`}return`<svg class="chart" viewBox="0 0 ${e} ${n}" preserveAspectRatio="none" height="${n}">${g}</svg>`}function G(t,e,n){let o=Math.max(...t.map(a=>a.count),1);return t.slice(0,n).map(a=>{let i=a.count/o*100,r=e?(a.count/e*100).toFixed(1):"0",l=a.value===""?"(empty)":a.value;return`<div class="bar-row" style="margin:3px 0">\n      <div style="display:flex;justify-content:space-between;gap:8px">\n        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%" title="${c(l)}">${c(l)}</span>\n        <span style="color:var(--muted);font-variant-numeric:tabular-nums">${E(a.count)} \\xB7 ${r}%</span>\n      </div>\n      <div style="height:5px;background:var(--panel-2);border-radius:3px;margin-top:2px;overflow:hidden">\n        <i style="display:block;height:100%;width:${i}%;background:var(--bar);border-radius:3px"></i>\n      </div>\n    </div>`}).join("")}var L=s.rows.map((t,e)=>e),u=-1,b=1,m="",h=-1,S=t=>s.types[s.columns[t]],M=null,q=!1;function U(){let t=location.hash.replace(/^#/,"");if(!t)return;let e;try{e=new URLSearchParams(t)}catch{return}let n=e.get("q");m=n!=null?n:"";let o=e.get("sortcol");o!==null?(u=s.columns.indexOf(o),b=e.get("sortdir")==="desc"?-1:1):(u=-1,b=1);let a=e.get("col");h=a!==null?s.columns.indexOf(a):-1;let i=e.get("theme");M=i==="dark"||i==="light"?i:null}function P(){if(q)return;let t=new URLSearchParams;m.trim()&&t.set("q",m),u>=0&&(t.set("sortcol",s.columns[u]),b===-1&&t.set("sortdir","desc")),h>=0&&t.set("col",s.columns[h]);let e=document.documentElement.getAttribute("data-theme");e&&t.set("theme",e);let n=t.toString(),o=location.pathname+location.search+(n?"#"+n:"#");try{history.replaceState(null,"",o)}catch{q=!0,location.hash=n,setTimeout(()=>{q=!1},0)}}function N(){let t=m.trim().toLowerCase(),e;if(!t)e=s.rows.map((n,o)=>o);else{e=[];for(let n=0;n<s.rows.length;n++){let o=s.rows[n],a=!1;for(let i=0;i<o.length;i++){let r=o[i];if(r==null)continue;if((k(S(i))?String(r):H(S(i))?O(r,S(i)):String(r)).toLowerCase().includes(t)){a=!0;break}}a&&e.push(n)}}if(u>=0){let n=S(u),o=k(n)||H(n);e.sort((a,i)=>{let r=s.rows[a][u],l=s.rows[i][u];if(r==null)return l==null?0:1;if(l==null)return-1;let f;return o?f=r-l:f=String(r).localeCompare(String(l),void 0,{numeric:!0}),f*b})}L=e}var T=30,x,z,V,B;function I(){B.innerHTML=\'<th class="rownum">#</th>\'+s.columns.map((t,e)=>{let n=s.types[t],o=u===e?`<span class="arrow">${b===1?"\\u25B2":"\\u25BC"}</span>`:"";return`<th data-c="${e}" title="${c(t)} (${n})">${c(t)}<span class="th-type">${n}</span>${o}</th>`}).join(""),B.querySelectorAll("th[data-c]").forEach(t=>{t.addEventListener("click",()=>{let e=+t.dataset.c;u===e?b=b===1?-1:1:(u=e,b=1),N(),I(),w(),R(e),P()})})}function w(){let t=L.length;z.style.height=t*T+"px";let e=x.scrollTop,n=x.clientHeight,o=Math.max(0,Math.floor(e/T)-8),a=Math.min(t,Math.ceil((e+n)/T)+8),i="";for(let r=o;r<a;r++){let l=L[r],f=s.rows[l],C=`<td class="rownum">${l+1}</td>`;for(let g=0;g<s.columns.length;g++){let p=S(g),$=f[g],A=$==null,K=A?"null":k(p)?"num":"",Q=A?"\\u2205":c(X($,p));C+=`<td class="${K}">${Q}</td>`}i+=`<tr style="position:absolute;top:${r*T}px;height:${T}px;left:0;right:0;display:table;table-layout:fixed;width:100%">${C}</tr>`}V.innerHTML=i}function R(t,e=!1){h=t,document.querySelectorAll(".col-card").forEach(n=>n.classList.toggle("active",+n.dataset.i===t)),tt(t),J(),e&&P()}function Y(){let t=d("#sidebar");t.innerHTML=`<h2>${s.columns.length} columns</h2>`+s.stats.map((e,n)=>{let o=e.count+e.nulls?e.nulls/(e.count+e.nulls)*100:0,a="";return e.histogram?a=`<div class="mini">${Z(e.histogram,280,34,"var(--bar)",e.type)}</div>`:e.top&&(a=`<div class="mini">${G(e.top,e.count,3)}</div>`),`<div class="col-card" data-i="${n}">\n      <div class="col-head">\n        <span class="col-name" title="${c(e.name)}">${c(e.name)}</span>\n        <span class="type-badge ${e.type}">${e.type}</span>\n      </div>\n      <div class="col-sub">\n        <span>${E(e.unique)}${e.uniqueApprox?"+":""} unique</span>\n        ${e.nulls?`<span>${o.toFixed(o<1?1:0)}% null</span>`:"<span>no nulls</span>"}\n      </div>\n      <div class="nullbar"><i style="width:${o}%"></i></div>\n      ${a}\n    </div>`}).join(""),t.querySelectorAll(".col-card").forEach(e=>{e.addEventListener("click",()=>R(+e.dataset.i,!0))})}function tt(t){let e=d("#detail");if(t<0){e.classList.remove("show");return}let n=s.stats[t],o="",a=(r,l)=>`<span>${r} <b>${l}</b></span>`;o+=a("count",E(n.count)),o+=a("nulls",E(n.nulls)),o+=a("unique",E(n.unique)+(n.uniqueApprox?"+":"")),k(n.type)?(n.min!==void 0&&(o+=a("min",v(n.min))),n.max!==void 0&&(o+=a("max",v(n.max))),n.mean!==void 0&&(o+=a("mean",v(n.mean))),n.median!==void 0&&(o+=a("median",v(n.median))),n.std!==void 0&&(o+=a("std",v(n.std)))):H(n.type)&&(n.minLabel&&(o+=a("min",n.minLabel)),n.maxLabel&&(o+=a("max",n.maxLabel)));let i="";n.histogram?i=`<div style="margin-top:10px;max-width:640px">${Z(n.histogram,640,80,"var(--bar)",n.type)}</div>`:n.top&&(i=`<div style="margin-top:10px;max-width:520px">${G(n.top,n.count,12)}</div>`),e.innerHTML=`<div class="d-head"><span class="d-name">${c(n.name)}</span><span class="type-badge ${n.type}">${n.type}</span></div>\n    <div class="stat-grid">${o}</div>${i}`,e.classList.add("show")}function et(){let t=s.source.split(/[\\\\/]/).pop()||s.source,e=s.title||t;document.title=`dataloupe \\xB7 ${e}`;let n=document.createElement("div");n.className="app";let o=s.truncated&&s.totalRowCount?`<span class="trunc-note">\\u26A0 showing first ${s.rowCount.toLocaleString()} of ${s.totalRowCount.toLocaleString()} rows</span>`:"",a=s.title?`<span class="src-sub" title="source file">${c(t)}</span>`:"",i=s.note?`<div class="note-bar"><span class="note-ico">\\u270E</span><span class="note-txt">${c(s.note)}</span></div>`:"";n.innerHTML=`\n    <header class="topbar">\n      <span class="brand"><span class="logo">\\u25C9</span> dataloupe</span>\n      <span class="meta">\n        <span><b>${c(e)}</b></span>\n        ${a}\n        <span><b>${s.rowCount.toLocaleString()}</b> rows</span>\n        <span><b>${s.columns.length}</b> cols</span>\n        <span>${s.format}</span>\n        ${o}\n      </span>\n      <span class="spacer"></span>\n      <span class="search">\n        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>\n        <input id="q" type="search" placeholder="Search all columns\\u2026" autocomplete="off">\n      </span>\n      <button class="iconbtn" id="about" title="About this file & current view">\\u24D8 about</button>\n      <button class="iconbtn" id="theme">\\u25D0 theme</button>\n    </header>\n    ${i}\n    <div class="prov-panel" id="prov" hidden>\n      <div class="prov-head"><span>About this file</span><button class="prov-close" id="prov-close" title="Close">\\u2715</button></div>\n      <div class="prov-body" id="prov-body"></div>\n    </div>\n    <div class="body">\n      <aside class="sidebar" id="sidebar"></aside>\n      <main class="main">\n        <div class="detail" id="detail"></div>\n        <div class="table-wrap" id="scroll">\n          <div id="spacer" style="position:relative;width:100%">\n            <table style="position:absolute;top:0;left:0;width:100%">\n              <thead><tr id="thead"></tr></thead>\n              <tbody id="tbody"></tbody>\n            </table>\n          </div>\n        </div>\n        <div class="footer">\n          <span id="count"></span>\n          <span class="spacer" style="flex:1"></span>\n          <span>generated offline by <a href="https://github.com/aurelio-nakamura/dataloupe" target="_blank" rel="noopener">dataloupe</a> \\xB7 no data left your machine</span>\n        </div>\n      </main>\n    </div>`,document.body.appendChild(n),x=d("#scroll"),z=d("#spacer"),V=d("#tbody"),B=d("#thead"),U(),Y(),I(),N(),w(),F(),x.addEventListener("scroll",()=>w(),{passive:!0}),window.addEventListener("resize",w);let r=d("#q");r.value=m;let l;r.addEventListener("input",()=>{clearTimeout(l),l=setTimeout(()=>{m=r.value,N(),x.scrollTop=0,w(),F(),P()},120)}),d("#theme").addEventListener("click",at),d("#about").addEventListener("click",()=>_()),d("#prov-close").addEventListener("click",()=>_(!1)),document.addEventListener("keydown",f=>{f.key==="Escape"&&y&&_(!1)}),j(),h>=0&&R(h),window.addEventListener("hashchange",()=>{q||(U(),r.value=m,j(),N(),I(),x.scrollTop=0,w(),F(),R(h))})}function F(){d("#count").textContent=`${L.length.toLocaleString()} row${L.length===1?"":"s"}${m?" matched":""}`,J()}var y=!1;function nt(){let t=new Date(s.generatedAt);return isNaN(t.getTime())?s.generatedAt:t.toISOString().replace("T"," ").replace(/\\.\\d{3}Z$/," UTC")}function ot(){let t=[];if(m.trim()&&t.push(`rows matching \\u201C<b>${c(m.trim())}</b>\\u201D`),u>=0&&t.push(`sorted by <b>${c(s.columns[u])}</b> ${b===1?"ascending":"descending"}`),h>=0&&t.push(`column <b>${c(s.columns[h])}</b> in focus`),!t.length)return"All rows, unfiltered and unsorted.";let e=t.join("; ").replace(/^./,n=>n.toUpperCase())+".";return m.trim()&&(e+=` <b>${L.length.toLocaleString()}</b> of ${s.rowCount.toLocaleString()} rows match.`),e}function W(){let t=d("#prov-body");if(!t)return;let e=s.truncated&&s.totalRowCount?`<b>${s.rowCount.toLocaleString()}</b> of ${s.totalRowCount.toLocaleString()} rows (truncated) \\xB7 <b>${s.columns.length}</b> columns`:`<b>${s.rowCount.toLocaleString()}</b> rows \\xB7 <b>${s.columns.length}</b> columns`,n=(i,r)=>`<div class="prov-row"><dt>${i}</dt><dd>${r}</dd></div>`,o="";s.title&&(o+=n("Title",c(s.title))),s.note&&(o+=n("Note",c(s.note))),o+=n("Source",`${c(s.source.split(/[\\\\/]/).pop()||s.source)} <span class="prov-dim">(${c(s.format)})</span>`),o+=n("Generated",`${nt()} <span class="prov-dim">by dataloupe ${c(s.version)}</span>`),o+=n("Shape",e),o+=`<div class="prov-view"><dt>Current view</dt><dd>${ot()}</dd></div>`,t.innerHTML=`<dl class="prov-dl">${o}</dl><div class="prov-actions"><button class="prov-copy" id="prov-copy">Copy link to this view</button><span class="prov-copied" id="prov-copied"></span></div><p class="prov-foot">Every field above travels inside this file. No data leaves your machine.</p>`;let a=document.getElementById("prov-copy");a&&a.addEventListener("click",st)}function st(){let t=document.getElementById("prov-copied"),e=()=>{t&&(t.textContent="Copied \\u2713",setTimeout(()=>{t.textContent=""},2e3))},n=()=>{t&&(t.textContent="Press \\u2318/Ctrl-C")},o=location.href;try{navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(o).then(e,()=>D(o,e,n)):D(o,e,n)}catch{D(o,e,n)}}function D(t,e,n){try{let o=document.createElement("textarea");o.value=t,o.style.position="fixed",o.style.opacity="0",document.body.appendChild(o),o.focus(),o.select();let a=document.execCommand("copy");document.body.removeChild(o),a?e():n()}catch{n()}}function J(){y&&W()}function _(t){y=t===void 0?!y:t;let e=d("#prov"),n=d("#about");e&&(e.hidden=!y),n&&n.classList.toggle("on",y),y&&W()}function j(){let t=matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches,e=M!=null?M:t?"dark":"light";document.documentElement.setAttribute("data-theme",e)}function at(){let e=document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",e),M=e,P()}et();})();\n';
var VIEWER_CSS = ':root{--bg:#f7f8fa;--panel:#ffffff;--panel-2:#f0f2f5;--border:#e2e6ec;--text:#1a1f29;--muted:#6b7484;--accent:#3b6ef5;--accent-soft:#e5edff;--num:#0a7d5a;--bar:#3b6ef5;--bar-soft:#c9d8ff;--null:#c7ccd6;--shadow:0 1px 3px rgba(20,30,50,0.08),0 1px 2px rgba(20,30,50,0.06);--mono:ui-monospace,"SF Mono","Cascadia Code","Roboto Mono",Menlo,Consolas,monospace;--sans:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}[data-theme="dark"]{--bg:#0e1116;--panel:#161b22;--panel-2:#1c232d;--border:#2a323d;--text:#e6edf3;--muted:#8b95a5;--accent:#5a8bff;--accent-soft:#1b2a4d;--num:#46c99a;--bar:#5a8bff;--bar-soft:#24365f;--null:#3a424e;--shadow:0 1px 3px rgba(0,0,0,0.4)}*{box-sizing:border-box}html,body{height:100%}body{margin:0;font-family:var(--sans);background:var(--bg);color:var(--text);font-size:14px;line-height:1.45;-webkit-font-smoothing:antialiased}.app{display:flex;flex-direction:column;height:100vh}header.topbar{display:flex;align-items:center;gap:16px;padding:10px 18px;background:var(--panel);border-bottom:1px solid var(--border);flex:0 0 auto}.brand{font-weight:700;letter-spacing:-0.02em;display:flex;align-items:center;gap:8px}.brand .logo{color:var(--accent)}.meta{color:var(--muted);font-size:12.5px;display:flex;gap:14px;flex-wrap:wrap}.meta b{color:var(--text);font-weight:600}.spacer{flex:1}.search{display:flex;align-items:center;gap:8px;background:var(--panel-2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;min-width:240px}.search input{border:none;background:transparent;color:var(--text);outline:none;width:100%;font-size:13px}.search svg{color:var(--muted);flex:0 0 auto}button.iconbtn{background:var(--panel-2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:13px}button.iconbtn:hover{border-color:var(--accent)}.trunc-note{color:#b26a00;font-size:12px}[data-theme="dark"] .trunc-note{color:#e0a95e}.src-sub{color:var(--muted);font-size:12px;opacity:0.85}.note-bar{display:flex;align-items:flex-start;gap:8px;padding:8px 16px;background:var(--note-bg,#fff8e1);border-bottom:1px solid var(--border);color:var(--text);font-size:13px;line-height:1.45}.note-bar .note-ico{color:var(--muted);flex:none}.note-bar .note-txt{white-space:pre-wrap;word-break:break-word}[data-theme="dark"] .note-bar{--note-bg:#2a2410}.body{display:flex;flex:1;min-height:0}aside.sidebar{flex:0 0 320px;overflow-y:auto;border-right:1px solid var(--border);background:var(--panel);padding:12px}aside.sidebar h2{font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--muted);margin:4px 6px 10px}.col-card{border:1px solid var(--border);border-radius:10px;padding:10px 11px;margin-bottom:9px;background:var(--panel);cursor:pointer;transition:border-color .12s,box-shadow .12s}.col-card:hover{border-color:var(--accent);box-shadow:var(--shadow)}.col-card.active{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}.col-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.col-name{font-weight:600;font-family:var(--mono);font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.type-badge{font-size:10.5px;font-weight:600;padding:1px 7px;border-radius:999px;background:var(--panel-2);color:var(--muted);border:1px solid var(--border);flex:0 0 auto}.type-badge.num,.type-badge.integer,.type-badge.number{color:var(--num)}.type-badge.date,.type-badge.datetime{color:#8a5cf6}.type-badge.boolean{color:#d9770a}.col-sub{color:var(--muted);font-size:11px;margin-top:4px;display:flex;gap:10px;flex-wrap:wrap}.nullbar{height:3px;background:var(--panel-2);border-radius:2px;margin-top:7px;overflow:hidden}.nullbar>i{display:block;height:100%;background:var(--null)}.mini{margin-top:8px}main.main{flex:1;min-width:0;display:flex;flex-direction:column}.detail{border-bottom:1px solid var(--border);background:var(--panel-2);padding:12px 16px;display:none}.detail.show{display:block}.detail .d-head{display:flex;align-items:baseline;gap:12px;margin-bottom:8px}.detail .d-name{font-family:var(--mono);font-weight:700}.stat-grid{display:flex;gap:22px;flex-wrap:wrap;color:var(--muted);font-size:12.5px}.stat-grid b{color:var(--text);font-weight:600;font-variant-numeric:tabular-nums}.table-wrap{flex:1;overflow:auto;position:relative}table{border-collapse:separate;border-spacing:0;width:100%}thead th{position:sticky;top:0;z-index:2;background:var(--panel);text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12px;color:var(--muted);font-weight:600;white-space:nowrap;cursor:pointer;user-select:none}thead th:hover{color:var(--text)}thead th .th-type{font-weight:400;opacity:0.7;margin-left:6px;font-size:10.5px}thead th .arrow{color:var(--accent);margin-left:4px}tbody td{padding:6px 12px;border-bottom:1px solid var(--border);white-space:nowrap;max-width:380px;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}tbody td.num{text-align:right;font-family:var(--mono);color:var(--num)}tbody td.null{color:var(--null);font-style:italic}tbody tr:hover td{background:var(--panel-2)}.rownum{color:var(--muted);font-family:var(--mono);font-size:11px;text-align:right;user-select:none}.footer{flex:0 0 auto;padding:6px 16px;border-top:1px solid var(--border);color:var(--muted);font-size:12px;background:var(--panel);display:flex;gap:16px}.footer a{color:var(--accent);text-decoration:none}.empty{padding:40px;text-align:center;color:var(--muted)}svg.chart{display:block;width:100%}.bar-row{font-size:11px}button.iconbtn.on{border-color:var(--accent);color:var(--accent);background:var(--accent-soft)}.prov-panel{position:absolute;top:52px;right:12px;z-index:20;width:min(420px,calc(100vw - 24px));background:var(--panel);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow),0 8px 30px rgba(20,30,50,0.18);overflow:hidden}.prov-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border);font-weight:600;font-size:13px}.prov-close{background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;line-height:1;padding:2px 4px}.prov-close:hover{color:var(--text)}.prov-body{padding:12px 14px;font-size:13px}.prov-dl{margin:0}.prov-row,.prov-view{display:grid;grid-template-columns:90px 1fr;gap:8px;padding:5px 0}.prov-view{border-top:1px solid var(--border);margin-top:6px;padding-top:9px}.prov-dl dt{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:0.04em;padding-top:1px}.prov-dl dd{margin:0;word-break:break-word}.prov-dim{color:var(--muted)}.prov-actions{display:flex;align-items:center;gap:10px;margin-top:12px}.prov-copy{background:var(--accent);color:#fff;border:1px solid var(--accent);border-radius:7px;padding:6px 11px;font-size:12.5px;cursor:pointer}.prov-copy:hover{filter:brightness(1.05)}.prov-copied{color:var(--muted);font-size:12px}.prov-foot{color:var(--muted);font-size:11.5px;margin:11px 0 2px}';

// src/render.ts
var VERSION = true ? "0.11.0" : "0.0.0-dev";
function renderHtml(ds, opts = {}) {
  const rows = ds.rows.map((r) => ds.columns.map((c) => normalize(r[c])));
  const payload = {
    columns: ds.columns,
    types: ds.types,
    rows,
    stats: ds.stats,
    rowCount: ds.rowCount,
    totalRowCount: ds.totalRowCount,
    truncated: ds.truncated,
    source: ds.source,
    format: ds.format,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    version: VERSION,
    ...opts.title ? { title: opts.title } : {},
    ...opts.note ? { note: opts.note } : {}
  };
  const json = JSON.stringify(payload).replace(/<\//g, "<\\/");
  const title = escapeHtml(opts.title || basename(ds.source));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="dataloupe ${VERSION}">
<title>dataloupe \xB7 ${title}</title>
<style>${VIEWER_CSS}</style>
</head>
<body>
<script id="dataloupe-data" type="application/json">${json}</script>
<script>window.__DATALOUPE__=JSON.parse(document.getElementById("dataloupe-data").textContent);</script>
<script>${VIEWER_JS}</script>
</body>
</html>
`;
}
function normalize(v) {
  if (v === void 0) return null;
  if (typeof v === "bigint") return Number(v);
  return v;
}
function basename(p) {
  return p.split(/[\\/]/).pop() || p;
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// src/diff-core.ts
function norm(v) {
  if (v === null || v === void 0) return "\0";
  if (v instanceof Date) return "d:" + v.getTime();
  if (typeof v === "number") return "n:" + v;
  if (typeof v === "boolean") return "b:" + v;
  if (typeof v === "bigint") return "n:" + v.toString();
  return "s:" + String(v);
}
function rowKey(row, cols) {
  return cols.map((c) => norm(row[c])).join("");
}
function unionColumns(a, b) {
  const out = [...a];
  const seen = new Set(a);
  for (const c of b) if (!seen.has(c)) {
    seen.add(c);
    out.push(c);
  }
  return out;
}
function isUniqueKey(rows, col) {
  if (rows.length === 0) return false;
  const seen = /* @__PURE__ */ new Set();
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === void 0 || v === "") return false;
    const k = norm(v);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}
function autoDetectKey(cols, before, after) {
  const idish = cols.filter((c) => /(^|[_\s-])(id|key|uuid|guid|slug|code)$/i.test(c) || /^id$/i.test(c));
  for (const c of [...idish, ...cols]) {
    if (isUniqueKey(before, c) && isUniqueKey(after, c)) return [c];
  }
  return [];
}
function toArray(row, cols) {
  return cols.map((c) => row[c] === void 0 ? null : row[c]);
}
function diffDatasets(beforeDs, afterDs, opts = {}) {
  const columns = unionColumns(beforeDs.columns, afterDs.columns);
  const before = beforeDs.rows;
  const after = afterDs.rows;
  let keyColumns = [];
  let keyAuto = false;
  if (opts.key !== void 0) {
    keyColumns = Array.isArray(opts.key) ? opts.key : [opts.key];
    keyColumns = keyColumns.filter((k) => k !== "");
  }
  if (keyColumns.length === 0) {
    const auto = autoDetectKey(columns, before, after);
    if (auto.length) {
      keyColumns = auto;
      keyAuto = true;
    }
  }
  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;
  if (keyColumns.length > 0) {
    const beforeMap = /* @__PURE__ */ new Map();
    for (const r of before) beforeMap.set(rowKey(r, keyColumns), r);
    const afterMap = /* @__PURE__ */ new Map();
    for (const r of after) afterMap.set(rowKey(r, keyColumns), r);
    for (const [k, aRow] of afterMap) {
      const bRow = beforeMap.get(k);
      if (!bRow) {
        added.push(toArray(aRow, columns));
        continue;
      }
      const diffCols = [];
      for (const c of columns) if (norm(bRow[c]) !== norm(aRow[c])) diffCols.push(c);
      if (diffCols.length === 0) unchanged++;
      else changed.push({ key: k, before: toArray(bRow, columns), after: toArray(aRow, columns), changed: diffCols });
    }
    for (const [k, bRow] of beforeMap) {
      if (!afterMap.has(k)) removed.push(toArray(bRow, columns));
    }
  } else {
    const beforeCounts = /* @__PURE__ */ new Map();
    for (const r of before) {
      const k = rowKey(r, columns);
      const e = beforeCounts.get(k);
      if (e) e.n++;
      else beforeCounts.set(k, { row: r, n: 1 });
    }
    for (const r of after) {
      const k = rowKey(r, columns);
      const e = beforeCounts.get(k);
      if (e && e.n > 0) {
        e.n--;
        unchanged++;
      } else added.push(toArray(r, columns));
    }
    for (const { row, n } of beforeCounts.values()) {
      for (let i = 0; i < n; i++) removed.push(toArray(row, columns));
    }
  }
  return {
    columns,
    keyColumns,
    keyAuto,
    added,
    removed,
    changed,
    unchanged,
    counts: { added: added.length, removed: removed.length, changed: changed.length, unchanged },
    before: { source: beforeDs.source, rowCount: beforeDs.rowCount },
    after: { source: afterDs.source, rowCount: afterDs.rowCount }
  };
}

// src/diff-render.ts
var DIFF_CSS = `
:root{--bg:#fff;--fg:#1f2328;--muted:#656d76;--line:#d0d7de;--add-bg:#e6ffec;--add-fg:#1a7f37;--del-bg:#ffebe9;--del-fg:#cf222e;--chg-bg:#fff8c5;--chg-fg:#9a6700;--cell-old:#ffebe9;--cell-new:#e6ffec;--head:#f6f8fa}
*{box-sizing:border-box}
body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:var(--fg);background:var(--bg)}
header{padding:16px 20px;border-bottom:1px solid var(--line)}
h1{font-size:18px;margin:0 0 4px}
h1 .v{color:var(--muted);font-weight:400;font-size:13px}
.sub{color:var(--muted);font-size:13px}
.sub code{background:var(--head);padding:1px 5px;border-radius:5px}
.bar{display:flex;gap:8px;flex-wrap:wrap;padding:12px 20px;border-bottom:1px solid var(--line);align-items:center}
.badge{border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:13px;cursor:pointer;user-select:none;background:var(--bg)}
.badge b{font-variant-numeric:tabular-nums}
.badge.off{opacity:.4}
.badge.added{border-color:var(--add-fg);color:var(--add-fg)}
.badge.removed{border-color:var(--del-fg);color:var(--del-fg)}
.badge.changed{border-color:var(--chg-fg);color:var(--chg-fg)}
.badge.unchanged{color:var(--muted)}
.wrap{overflow:auto;max-height:calc(100vh - 150px)}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{border-bottom:1px solid var(--line);padding:6px 10px;text-align:left;white-space:nowrap;vertical-align:top}
th{position:sticky;top:0;background:var(--head);z-index:1;font-weight:600}
td.status{font-weight:600;text-align:center;width:1%}
tr.added td{background:var(--add-bg)} tr.added td.status{color:var(--add-fg)}
tr.removed td{background:var(--del-bg)} tr.removed td.status{color:var(--del-fg)}
tr.changed td.status{color:var(--chg-fg)}
.old{background:var(--cell-old);text-decoration:line-through;color:var(--del-fg);border-radius:4px;padding:0 3px}
.new{background:var(--cell-new);color:var(--add-fg);border-radius:4px;padding:0 3px}
.cellchg{white-space:normal}
.null{color:var(--muted);font-style:italic}
.empty{padding:40px 20px;text-align:center;color:var(--muted)}
footer{padding:12px 20px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
footer a{color:inherit}
@media (prefers-color-scheme:dark){:root{--bg:#0d1117;--fg:#e6edf3;--muted:#8b949e;--line:#30363d;--add-bg:#12261e;--add-fg:#3fb950;--del-bg:#25171c;--del-fg:#f85149;--chg-bg:#272115;--chg-fg:#d29922;--cell-old:#3c1618;--cell-new:#12331f;--head:#161b22}}
`;
var DIFF_JS = `(function(){
var D=window.__DATALOUPE_DIFF__;
var cols=D.columns, key=D.keyColumns;
var show={added:true,removed:true,changed:true,unchanged:false};
function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
function cell(v){if(v===null||v===undefined||v==='')return '<span class="null">null</span>';return esc(v)}
function keyLabel(){return key.length? 'matched by '+key.map(function(k){return '<code>'+esc(k)+'</code>'}).join(', ')+(D.keyAuto?' (auto-detected)':'') : 'matched by whole row (no key column \u2014 pass --key for cell-level changes)'}
var rows=[];
D.removed.forEach(function(r){rows.push({s:'removed',v:r})});
D.added.forEach(function(r){rows.push({s:'added',v:r})});
D.changed.forEach(function(c){rows.push({s:'changed',c:c})});
function render(){
  var tb=document.getElementById('tb');
  var html='';var shown=0;
  for(var i=0;i<rows.length;i++){var row=rows[i];if(!show[row.s])continue;shown++;
    if(row.s==='changed'){
      var c=row.c, chg={};c.changed.forEach(function(n){chg[n]=1});
      html+='<tr class="changed"><td class="status">~</td>';
      for(var j=0;j<cols.length;j++){var name=cols[j];
        if(chg[name]){html+='<td class="cellchg"><span class="old">'+cell(c.before[j])+'</span> <span class="new">'+cell(c.after[j])+'</span></td>';}
        else{html+='<td>'+cell(c.after[j])+'</td>';}
      }
      html+='</tr>';
    } else {
      var sym=row.s==='added'?'+':'\u2212';
      html+='<tr class="'+row.s+'"><td class="status">'+sym+'</td>';
      for(var k=0;k<cols.length;k++)html+='<td>'+cell(row.v[k])+'</td>';
      html+='</tr>';
    }
  }
  if(shown===0)html='<tr><td class="empty" colspan="'+(cols.length+1)+'">No rows match the current filter.</td></tr>';
  tb.innerHTML=html;
  document.getElementById('keyline').innerHTML=keyLabel();
}
function badge(id){var el=document.getElementById(id);el.onclick=function(){show[id]=!show[id];el.classList.toggle('off',!show[id]);render()};el.classList.toggle('off',!show[id])}
['added','removed','changed','unchanged'].forEach(badge);
render();
})();`;
function esc(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function base(p) {
  return p.split(/[\\/]/).pop() || p;
}
function renderDiffHtml(diff) {
  const json = JSON.stringify(diff).replace(/<\//g, "<\\/");
  const bName = esc(base(diff.before.source));
  const aName = esc(base(diff.after.source));
  const c = diff.counts;
  const ths = ['<th class="status">\xB7</th>', ...diff.columns.map((col) => `<th>${esc(col)}</th>`)].join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="dataloupe ${VERSION}">
<title>dataloupe diff \xB7 ${bName} \u2192 ${aName}</title>
<style>${DIFF_CSS}</style>
</head>
<body>
<header>
<h1>dataloupe diff <span class="v">v${VERSION}</span></h1>
<div class="sub"><code>${bName}</code> (${diff.before.rowCount.toLocaleString()} rows) \u2192 <code>${aName}</code> (${diff.after.rowCount.toLocaleString()} rows)</div>
<div class="sub" id="keyline"></div>
</header>
<div class="bar">
<span class="badge added" id="added"><b>+${c.added.toLocaleString()}</b> added</span>
<span class="badge removed" id="removed"><b>\u2212${c.removed.toLocaleString()}</b> removed</span>
<span class="badge changed" id="changed"><b>~${c.changed.toLocaleString()}</b> changed</span>
<span class="badge unchanged" id="unchanged"><b>=${c.unchanged.toLocaleString()}</b> unchanged</span>
</div>
<div class="wrap">
<table><thead><tr>${ths}</tr></thead><tbody id="tb"></tbody></table>
</div>
<footer>Generated offline by <a href="https://github.com/aurelio-nakamura/dataloupe">dataloupe</a> \u2014 no data left your machine. Built &amp; maintained by an AI agent (Aurelio Nakamura).</footer>
<script id="dataloupe-diff-data" type="application/json">${json}</script>
<script>window.__DATALOUPE_DIFF__=JSON.parse(document.getElementById("dataloupe-diff-data").textContent);</script>
<script>${DIFF_JS}</script>
</body>
</html>
`;
}

// src/cli.ts
function parseArgs(argv) {
  const a = { open: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        a.help = true;
        break;
      case "-v":
      case "--version":
        a.version = true;
        break;
      case "-o":
      case "--output":
        a.output = argv[++i];
        break;
      case "--open":
        a.open = true;
        break;
      case "--limit":
        a.limit = Number(argv[++i]);
        break;
      case "--format":
        a.format = argv[++i];
        break;
      case "--delimiter":
        a.delimiter = argv[++i];
        break;
      case "--sheet":
        a.sheet = argv[++i];
        break;
      case "--title":
        a.title = argv[++i];
        break;
      case "--note":
        a.note = argv[++i];
        break;
      case "-":
        if (!a.input) a.input = "-";
        break;
      default:
        if (arg.startsWith("--output=")) a.output = arg.slice(9);
        else if (arg.startsWith("--limit=")) a.limit = Number(arg.slice(8));
        else if (arg.startsWith("--format=")) a.format = arg.slice(9);
        else if (arg.startsWith("--delimiter=")) a.delimiter = arg.slice(12);
        else if (arg.startsWith("--sheet=")) a.sheet = arg.slice(8);
        else if (arg.startsWith("--title=")) a.title = arg.slice(8);
        else if (arg.startsWith("--note=")) a.note = arg.slice(7);
        else if (!arg.startsWith("-") && !a.input) a.input = arg;
    }
  }
  return a;
}
var HELP = `dataloupe ${VERSION} \u2014 turn a data file into one self-contained, offline HTML explorer

USAGE
  dataloupe <file> [options]
  dataloupe diff <before> <after> [--key col]   (a git-diff for data files)
  dataloupe mcp                                 (MCP server for AI assistants, stdio)
  npx dataloupe data.csv --open

ARGUMENTS
  <file>                CSV, TSV, JSON, NDJSON/JSONL, Parquet, or Excel (.xlsx)
                       Use "-" or pipe to read from stdin (text formats only)

OPTIONS
  -o, --output <file>   output HTML path (default: <input>.html, or dataloupe.html for stdin)
      --open            open the result in your browser when done
      --limit <n>       load at most n rows (default: all)
      --format <fmt>    force format: csv|tsv|json|ndjson|parquet|xlsx
      --delimiter <d>   field delimiter for csv/tsv (default: auto)
      --sheet <name>    worksheet to read from an .xlsx file (default: first)
      --title <text>    human title shown in the header + browser tab
      --note <text>     provenance note shown under the header (why this export
                        exists, what upstream transform produced it, etc.)
  -h, --help            show this help
  -v, --version         print version

The output is a single .html file with no external requests: no CDN, no fonts,
no network, no telemetry. Your data never leaves your machine. Open it by
double-click, email it, or commit it to a repo.

Built and maintained by an AI agent (Aurelio Nakamura).`;
async function openInBrowser(file) {
  const { spawn } = await import("node:child_process");
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", file] : [file];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
  }
}
function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}
function sniffTextFormat(text) {
  const t = text.replace(/^\uFEFF/, "").trimStart();
  if (t.startsWith("[") || t.startsWith("{")) {
    const firstLines = t.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (firstLines.length > 1 && firstLines.every((l) => l.trim().startsWith("{"))) {
      return "ndjson";
    }
    return "json";
  }
  if (text.includes("	") && !text.split(/\r?\n/)[0].includes(",")) return "tsv";
  return "csv";
}
function parseDiffArgs(argv) {
  const a = { open: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--output") a.output = argv[++i];
    else if (arg.startsWith("--output=")) a.output = arg.slice(9);
    else if (arg === "-k" || arg === "--key") a.key = argv[++i];
    else if (arg.startsWith("--key=")) a.key = arg.slice(6);
    else if (arg === "--open") a.open = true;
    else if (arg === "--json") a.json = true;
    else if (!arg.startsWith("-")) {
      if (!a.before) a.before = arg;
      else if (!a.after) a.after = arg;
    }
  }
  return a;
}
var DIFF_HELP = `dataloupe diff \u2014 a git-diff for data files, as one offline HTML report

USAGE
  dataloupe diff <before> <after> [options]
  npx dataloupe diff old.csv new.csv --key id --open

ARGUMENTS
  <before> <after>      two data files (CSV/TSV/JSON/NDJSON/Parquet/xlsx)

OPTIONS
  -k, --key <col[,col]> column(s) that identify a row \u2192 enables per-cell changes
                        (auto-detected from a unique id-like column when omitted)
  -o, --output <file>   output HTML path (default: <after>.diff.html)
      --json            print a machine-readable summary (counts) to stdout
      --open            open the result in your browser when done

Emits a single self-contained .html: added / removed / changed rows with the
exact cells that changed highlighted. No external requests; data never leaves
your machine. Built and maintained by an AI agent (Aurelio Nakamura).`;
async function runDiff(argv) {
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(DIFF_HELP + "\n");
    return;
  }
  const a = parseDiffArgs(argv);
  if (!a.before || !a.after) {
    process.stderr.write("dataloupe diff: need two files: dataloupe diff <before> <after>\n");
    process.exit(1);
  }
  const before = resolve2(a.before);
  const after = resolve2(a.after);
  const ext = extname(after);
  const defaultOut = (ext ? after.slice(0, -ext.length) : after) + ".diff.html";
  const output = a.output ? resolve2(a.output) : defaultOut;
  const t0 = Date.now();
  let bDs, aDs;
  try {
    [bDs, aDs] = await Promise.all([buildDataset(before), buildDataset(after)]);
  } catch (err2) {
    process.stderr.write(`dataloupe diff: ${err2.message}
`);
    process.exit(1);
  }
  const key = a.key ? a.key.split(",").map((s) => s.trim()).filter(Boolean) : void 0;
  const result = diffDatasets(bDs, aDs, { key });
  const html = renderDiffHtml(result);
  await writeFile(output, html, "utf8");
  const ms = Date.now() - t0;
  const size = Buffer.byteLength(html, "utf8");
  const c = result.counts;
  const keyNote = result.keyColumns.length ? `key: ${result.keyColumns.join(",")}${result.keyAuto ? " (auto)" : ""}` : "whole-row match (no key)";
  if (a.json) {
    process.stdout.write(
      JSON.stringify({
        output,
        bytes: size,
        ms,
        keyColumns: result.keyColumns,
        keyAuto: result.keyAuto,
        counts: {
          added: c.added,
          removed: c.removed,
          changed: c.changed,
          unchanged: c.unchanged
        },
        changed: c.added + c.removed + c.changed > 0
      }) + "\n"
    );
  } else {
    process.stdout.write(
      `dataloupe diff \u2192 ${output}
  +${c.added} added \xB7 \u2212${c.removed} removed \xB7 ~${c.changed} changed \xB7 =${c.unchanged} unchanged
  ${keyNote} \xB7 ${fmtBytes(size)} \xB7 ${ms} ms
`
    );
  }
  if (a.open) await openInBrowser(output);
}
async function main() {
  if (process.argv[2] === "diff") {
    await runDiff(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "mcp") {
    const { spawn } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const serverPath = fileURLToPath(new URL("./mcp.js", import.meta.url));
    const child = spawn(process.execPath, [serverPath, ...process.argv.slice(3)], {
      stdio: "inherit"
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }
  const args = parseArgs(process.argv.slice(2));
  if (args.version) {
    process.stdout.write(VERSION + "\n");
    return;
  }
  if (args.help) {
    process.stdout.write(HELP + "\n");
    return;
  }
  const useStdin = args.input === "-" || !args.input && !process.stdin.isTTY;
  if (!useStdin && !args.input) {
    process.stdout.write(HELP + "\n");
    process.exit(1);
  }
  if (useStdin) {
    const text = await readStdin();
    if (text.trim() === "") {
      process.stderr.write("dataloupe: no data on stdin\n");
      process.exit(1);
    }
    const format = args.format ?? sniffTextFormat(text);
    const output2 = args.output ? resolve2(args.output) : resolve2("dataloupe.html");
    const t02 = Date.now();
    let ds2;
    try {
      ds2 = buildDatasetFromText(text, format, { limit: args.limit, delimiter: args.delimiter });
    } catch (err2) {
      process.stderr.write(`dataloupe: failed to read stdin: ${err2.message}
`);
      process.exit(1);
    }
    const html2 = renderHtml(ds2, { title: args.title, note: args.note });
    await writeFile(output2, html2, "utf8");
    const ms2 = Date.now() - t02;
    const size2 = Buffer.byteLength(html2, "utf8");
    process.stdout.write(
      `dataloupe \u2192 ${output2}
  ${ds2.rowCount.toLocaleString()} rows \xD7 ${ds2.columns.length} cols \xB7 ${ds2.format} \xB7 ${fmtBytes(size2)} \xB7 ${ms2} ms${ds2.truncated ? " \xB7 (truncated)" : ""}
`
    );
    if (args.open) await openInBrowser(output2);
    return;
  }
  const input = resolve2(args.input);
  const ext = extname(input);
  const defaultOut = (ext ? input.slice(0, -ext.length) : input) + ".html";
  const output = args.output ? resolve2(args.output) : defaultOut;
  const t0 = Date.now();
  let ds;
  try {
    ds = await buildDataset(input, {
      format: args.format,
      limit: args.limit,
      delimiter: args.delimiter,
      sheet: args.sheet
    });
  } catch (err2) {
    process.stderr.write(`dataloupe: failed to read ${basename2(input)}: ${err2.message}
`);
    process.exit(1);
  }
  const html = renderHtml(ds, { title: args.title, note: args.note });
  await writeFile(output, html, "utf8");
  const ms = Date.now() - t0;
  const size = Buffer.byteLength(html, "utf8");
  process.stdout.write(
    `dataloupe \u2192 ${output}
  ${ds.rowCount.toLocaleString()} rows \xD7 ${ds.columns.length} cols \xB7 ${ds.format} \xB7 ${fmtBytes(size)} \xB7 ${ms} ms${ds.truncated ? " \xB7 (truncated)" : ""}
`
  );
  if (args.open) await openInBrowser(output);
}
main().catch((err2) => {
  process.stderr.write(`dataloupe: ${err2.stack || err2}
`);
  process.exit(1);
});
/*! Bundled license information:

papaparse/papaparse.js:
  (* @license
  Papa Parse
  v5.5.4
  https://github.com/mholt/PapaParse
  License: MIT
  *)
*/
