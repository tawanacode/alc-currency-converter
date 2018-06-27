$(document).ready(function () {
  const inputVal = document.querySelector("#inputValue");
  const convertFrom = document.querySelector("#convertFrom");
  const convertTo = document.querySelector("#convertTo");
  const selectedConvertFrom = document.querySelector("#convertFrom option[selected]").innerHTML;
  const selectedConvertTo = document.querySelector("#convertTo option[selected]").innerHTML;

  //inputVal.addEventListener('keydown', function () {
    $.getJSON("https://free.currencyconverterapi.com/api/v5/currencies", function (json) {
      const currencies = json.results;
      console.log(currencies);
      for(let currency in currencies){

        console.log(currencies[currency].currencyName, currencies[currency].id); 
      }
    });
  //});

  inputVal.addEventListener('keydown', function () {
    $.getJSON("https://free.currencyconverterapi.com/api/v5/convert?q="+selectedConvertFrom+"_"+selectedConvertTo+"&callback=?", function (json) {
      const exchangeRate = json.results[`${selectedConvertFrom}_${selectedConvertTo}`].val;
      const results = Number.parseFloat(exchangeRate * inputVal.value).toFixed(3);
        $("#convertedValue").html(results);
    });
  });

});