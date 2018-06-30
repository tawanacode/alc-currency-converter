if('serviceWorker' in navigator){
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function(reg){
        console.log("sw is registered");//, reg);
    }).catch(function(err){
        console.log("err trying to register");
    });
 });
}