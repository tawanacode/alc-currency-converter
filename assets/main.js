$(document).ready(function() {
  const inputVal = $("inputVal");
  const convertFrom = $("convertFrom").val();
  const convertTo = $("convertTo").val();

  $("#convertBtn").on("click", function(){
    $.getJSON("https://free.currencyconverterapi.com/api/v5/convert?q=`${convertFrom}_${convertTo}`&compact=y&callback=?", function(json) {
      let convertedVal = 0;
     // return convertedVal = json.forEach(function(e){
       console.log(json);
       $(".convertedValue").html(json);
    // });

      
    });
  });

 $('#searchText').keypress(function(e){
     if(e.which == 13){//Enter key pressed
        $('#searchBtn').click();//Trigger search button click event
     }
  });
});