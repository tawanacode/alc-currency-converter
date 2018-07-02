'use strict';

(function () {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function (resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function (value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function (prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function () {
          return this[targetProp][prop];
        },
        set: function (val) {
          this[targetProp][prop] = val;
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function (prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function () {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
  ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
  ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
  ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
  ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function (methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function () {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function () {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function (value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function () {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function () {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
  ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getKey',
    'getAllKeys',
    'count'
  ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
  ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
  ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function (resolve, reject) {
      idbTransaction.oncomplete = function () {
        resolve();
      };
      idbTransaction.onerror = function () {
        reject(idbTransaction.error);
      };
      idbTransaction.onabort = function () {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function () {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
  ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
  ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function () {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
  ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function () {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
  ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
  ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function (funcName) {
    [ObjectStore, Index].forEach(function (Constructor) {
      // Don't create iterateKeyCursor if openKeyCursor doesn't exist.
      if (!(funcName in Constructor.prototype)) return;

      Constructor.prototype[funcName.replace('open', 'iterate')] = function () {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var nativeObject = this._store || this._index;
        var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
        request.onsuccess = function () {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function (Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function (query, count) {
      var instance = this;
      var items = [];

      return new Promise(function (resolve) {
        instance.iterateCursor(query, function (cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function (name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      if (request) {
        request.onupgradeneeded = function (event) {
          if (upgradeCallback) {
            upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
          }
        };
      }

      return p.then(function (db) {
        return new DB(db);
      });
    },
    delete: function (name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
    module.exports.default = module.exports;
  }
  else {
    self.idb = exp;
  }
}());

(function () {
  'use strict';
  window.addEventListener('load', function () {
    const inputVal = document.querySelector("#inputValue");
    let select = document.querySelectorAll("select");
    const convertedVal = document.querySelector("#convertedValue");
    const convertBtn = document.querySelector("#convertBtn");

    console.log(inputVal.value);
    //check for support
    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }

    var dbPromise = idb.open('converterDB', 1, function (upgradeDb) {

      if (!upgradeDb.objectStoreNames.contains('currencies')) {
        var currencyOS = upgradeDb.createObjectStore('currencies', { keyPath: 'currencyName' });
        currencyOS.createIndex('country', 'currencyName');
        currencyOS.createIndex('symbol', 'currencySymbol');
        currencyOS.createIndex('id', 'id');
      }

      if (!upgradeDb.objectStoreNames.contains('rates')) {
        var currencyOS = upgradeDb.createObjectStore('rates', { keyPath: 'id' });
        currencyOS.createIndex('id', 'id');
      }
    });

    fetch("https://free.currencyconverterapi.com/api/v5/currencies").then(function (response) {
      return response.json();
    }).then(function (json) {
      //populate database with countries and currencies
      const data = json.results;
      dbPromise.then(function (db) {
        const tx = db.transaction('currencies', 'readwrite');
        const currencyStore = tx.objectStore('currencies');

        for (let prop in data) {
          currencyStore.put({
            id: data[prop].id,
            currencyName: data[prop].currencyName,
            symbol: data[prop].currencySymbol
          });
        }

        return currencyStore.getAll();
      }).then(function (currencies) {
        //populate select dropdowns with option elements
        Array.prototype.forEach.call(select, function (e) {
          currencies.forEach(function (currency) {
            let option = document.createElement("option");
            option.text = currency.currencyName;
            option.value = currency.id;
            e.appendChild(option);

            if (e.id === "convertFrom") {
              if (option.value === 'USD') {
                option.setAttribute("selected", "");
              }
            } else {
              if (option.value === 'BWP') {
                option.setAttribute("selected", "");
              }
            }

          e.addEventListener("change", function (el) {
            //show the current country name in the select
            const selectId = e.id;
            const suffix = selectId.endsWith("To") ? "To" : "From";
            //console.log(el.path[1].firstElementChild.textContent.trim());
            let options = el.target.options;
            let currentID = document.querySelector(`#convertCode${suffix}`);
            let currentSymbol = document.querySelector(`#convertSymbol${suffix}`);
            

            Array.prototype.forEach.call(options, function (option) {
              if (option.hasAttribute("selected")) {
                option.removeAttribute("selected");//console.log(option);
              }
              if (option.selected == true) {
                option.setAttribute("selected", " ");
                currentID.innerHTML = option.value;
              }
            });
console.log(currency.id);
            currentSymbol.innerHTML = currency.id;

            // oldCurrencyVal.innerHTML = newCurrencyVal;
            //if (suffix === "To") {
            //selectedConvertTo = document.querySelector(`#convert${suffix} option.selected`).value;
            //} else {
            //selectedConvertFrom = document.querySelector(`#convert${suffix} option.selected`).value;
            // }

            //show currency unit next to country
            //oldCurrencySymbol.innerHTML = (newCurrencySymbol !== undefined) ? newCurrencySymbol : newCurrencyVal;
            convertBtn.click();
          });
        });
        });
        //convertBtn.addEventListener("click", function (e) {
        fetch("https://free.currencyconverterapi.com/api/v5/convert?q=" + selectedConvertFrom + "_" + selectedConvertTo).then(function (response) {
          return response.json();
        }).then(function (json) {
          const data = json.results;
          dbPromise.then(function (db) {
            const tx = db.transaction('rates', 'readwrite');
            const ratesStore = tx.objectStore('rates');

            for (let prop in data) {
              ratesStore.put({
                id: data[prop].id
              });
            }

            return ratesStore.getAll();
          }).then(function (rates) {
            console.log(rates);
            currencies.forEach(function (currency) {

              console.log(currency.id);
            });
          });

          // console.log(json, selectedConvertFrom, selectedConvertTo);
          const exchangeRate = json.results[`${selectedConvertFrom}_${selectedConvertTo}`].val;
          const results = Number.parseFloat(exchangeRate * (inputVal.value).replace(/\s/, "")).toFixed(2);
          //  convertedVal.innerHTML = results.toLocaleString('i');

        });
        //});
      });
    });


    inputVal.addEventListener("keydown", function (e) {
      if (e.key === 'Enter') {//Enter key pressed
        e.preventDefault();
        convertBtn.click();//Trigger search button click event
      }
    });

  });
})();