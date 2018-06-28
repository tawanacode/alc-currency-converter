(function () {
  'use strict';
  window.addEventListener('load', function () {

    const inputVal = document.querySelector("#inputValue");
    let select = document.querySelectorAll("select");
    const fromSymbol = document.querySelector("#convertFromSymbol");
    const toSymbol = document.querySelector("#convertToSymbol");
    const convertedVal = document.querySelector("#convertedValue");

    let convertFrom = document.querySelector("#convertFrom option[selected]");
    let convertTo = document.querySelector("#convertTo option[selected]");

    let selectedConvertFrom = convertFrom.value;
    let selectedConvertTo = convertTo.value;
    const convertBtn = document.querySelector("#convertBtn");

    //console.log(select);
    fetch("https://free.currencyconverterapi.com/api/v5/currencies").then(function (response) {
      return response.json();
    }).then(function (json) {
      //console.log(json.results);
      //populate select dropdowns with currency name
      Array.prototype.forEach.call(select, function (e) {
        for (let prop in json.results) {
          const option = document.createElement("option");
          option.text = json.results[prop].currencyName;
          option.value = json.results[prop].id;
          e.appendChild(option);
        }

        e.addEventListener("change", function (el) {
          //show the current country name in the select
          const selectId = el.target.previousElementSibling.firstElementChild.id;
          const inputId = selectId.endsWith("To") ? "convertSymbolTo" : "convertSymbolFrom";
          
          const oldCurrencyVal = document.querySelector(`#${selectId}`);
          const oldCurrencySymbol = document.querySelector(`#${inputId}`);

          const newCurrencyVal = el.target.selectedOptions[0].value;
          const newCurrencySymbol = json.results[newCurrencyVal].currencySymbol;

          //update selected currency
          //console.log(oldCurrencySymbol);
         // console.log(newCurrencyVal.currencySymbol);
          oldCurrencyVal.innerHTML = newCurrencyVal;

          //show currency unit next to country
          oldCurrencySymbol.innerHTML = (newCurrencySymbol !== undefined) ? newCurrencySymbol : newCurrencyVal;

          //convertBtn.click();
        });
      });
    });

    convertBtn.addEventListener("click", function (e) {
      e.preventDefault();
      console.log(selectedConvertFrom);
      fetch("https://free.currencyconverterapi.com/api/v5/convert?q=" + selectedConvertFrom + "_" + selectedConvertTo).then(function (response) {
        return response.json();
      }).then(function (json) {
        const exchangeRate = json.results[`${selectedConvertFrom}_${selectedConvertTo}`].val;
        const results = Number.parseFloat(exchangeRate * inputVal.value).toFixed(2);
        convertedVal.innerHTML = results;
      });
    });
  });
})();