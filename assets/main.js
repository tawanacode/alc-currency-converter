(function () {
  'use strict';
  window.addEventListener('load', function () {
    const inputVal = document.querySelector("#inputValue");
    let select = document.querySelectorAll("select");
    const convertedVal = document.querySelector("#convertedValue");
    const convertBtn = document.querySelector("#convertBtn");

    //console.log(inputVal.value);
    //check for support

    if (!('indexedDB' in window)) {
      console.log('This browser doesn\'t support IndexedDB');
      return;
    }

    var dbPromise = idb.open('converterDB', 1, function (upgradeDb) {

      if (!upgradeDb.objectStoreNames.contains('currencies')) {
        const currencyOS = upgradeDb.createObjectStore('currencies', { keyPath: 'currencyName' });
        currencyOS.createIndex('country', 'currencyName');
        currencyOS.createIndex('symbol', 'currencySymbol');
        currencyOS.createIndex('id', 'id');
      }
    });

    const request = new Request('https://free.currencyconverterapi.com/api/v6/currencies?apiKey=0c189bdeffd156118414', {
      mode: 'cors'
    });

    fetch(request).then(function (response) {
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

        //create a rates object
        Array.prototype.forEach.call(select, function (e) {

          const selectId = e.id;
          const suffix = selectId.endsWith("To") ? "To" : "From";
          let currentID = document.querySelector(`#convertCode${suffix}`);
          let currentSymbol = document.querySelector(`#convertSymbol${suffix}`);

          //populate select dropdowns with option elements
          currencies.forEach(function (currency) {
            let option = document.createElement("option");
            let dataSymbol = (currency.symbol !== undefined) ? currency.symbol : currency.id;

            option.text = currency.currencyName;
            option.value = currency.id;
            option.setAttribute("data-symbol", dataSymbol);
            e.appendChild(option);

            //set default selected values
            if (e.id === "convertFrom") {
              if (option.value === 'USD') {
                option.setAttribute("selected", "");
              }
            } else {
              if (option.value === 'BWP') {
                option.setAttribute("selected", "");
              }
            }
          });

          e.addEventListener("change", function (el) {

            let options = el.target.options; //find all the options values

            Array.prototype.forEach.call(options, function (option) {
              if (option.hasAttribute("selected")) { //look for previously selected option
                option.removeAttribute("selected");  //remove the 'seleced' flag
              }
              if (option.selected == true) { //check to see if this is the selected option
                option.setAttribute("selected", ""); //mark otion as selected
                currentID.innerHTML = option.value; //update currency value
                currentSymbol.innerHTML = option.dataset.symbol; //update currency symbol
              }
            });
            convertBtn.click();
          });
        });
      });
    });

    convertBtn.addEventListener("click", function () {
      const selectFrom = document.querySelector("#convertFrom option[selected]").value;
      const selectTo = document.querySelector("#convertTo option[selected]").value;

      fetch(`https://free.currencyconverterapi.com/api/v6/convert?q=${selectFrom}_${selectTo}&compact=ultra&apiKey=0c189bdeffd156118414`).then(function (response) {
        return response.json();
      }).then(function (json) {
        const exchangeRate = json[`${selectFrom}_${selectTo}`];
        const results = Number.parseFloat(exchangeRate * (inputVal.value).replace(/\s/, "")).toFixed(2);
        convertedVal.innerHTML = results.toLocaleString('i');
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
