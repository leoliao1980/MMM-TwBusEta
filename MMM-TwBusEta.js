const BusInfoHdr = ["symbol", "route", "close", "change", "changeP", "volume"]
const BusInfoTitle = ["Symbol", "Cur.Price", "Prev.Close", "CHG", "CHG%", "Volume"]

Module.register("MMM-TwBusEta", {
    // define variables used by module, but not in config data
    //some_variable:  true,
    //some_other_variable: "a string",

    // holder for config info from module_name.js
    //config:null,

    // anything here in defaults will be added to the config data
    // and replaced if the same thing is provided in config
    defaults: {
      apiKey : "254",
      timeFormat: "DD-MM HH:mm",
      symbols : ["Taipei"],
      tickerDuration: 60,
      chartDays: 90,
    },

/*    init: function(){
        Log.log(this.name + " is in init!");
    },*/

    start: function(){
        Log.log(this.name + " is starting!");
        this.sendSocketNotification("INIT", this.config)
        this.stocks = {}
        this.isStarted = false
    },

/*    loaded: function(callback) {
        Log.log(this.name + " is loaded!");
        callback();
    },*/

    // return list of other functional scripts to use, if any (like require in node_helper)
    getScripts: function() {
    return  [
            // sample of list of files to specify here, if no files,do not use this routine, or return empty list

            //'script.js', // will try to load it from the vendor folder, otherwise it will load is from the module folder.
            //'moment.js', // this file is available in the vendor folder, so it doesn't need to be available in the module folder.
            //this.file('anotherfile.js'), // this file will be loaded straight from the module folder.
            //'https://code.jquery.com/jquery-2.2.3.min.js',  // this file will be loaded from the jquery servers.
        ]
    }, 

    // return list of stylesheet files to use if any
    getStyles: function() {
        return ["MMM-AVStock.css"]
    },
/*
    getStyles: function() {
        return  [
            // sample of list of files to specify here, if no files, do not use this routine, , or return empty list

            //'script.css', // will try to load it from the vendor folder, otherwise it will load is from the module folder.
            //'font-awesome.css', // this file is available in the vendor folder, so it doesn't need to be avialable in the module folder.
            //this.file('anotherfile.css'), // this file will be loaded straight from the module folder.
            //'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css',  // this file will be loaded from the bootstrapcdn servers.
        ]
    },
*/
    // return list of translation files to use, if any
    /*getTranslations: function() {
        return {
            // sample of list of files to specify here, if no files, do not use this routine, , or return empty list

            // en: "translations/en.json",  (folders and filenames in your module folder)
            // de: "translations/de.json"
        }
    }, */ 



    // only called if the module BusInfoHdr was configured in module config in config.js
    getHeader: function() {
        return this.data.BusInfoHdr + " Foo Bar";
    },

    // messages received from other modules and the system (NOT from your node helper)
    // payload is a notification dependent data structure
    notificationReceived: function(noti, payload) {
        if (noti == "DOM_OBJECTS_CREATED") {
            this.sendSocketNotification("START")
            this.prepare()
        }
    },
/*
    notificationReceived: function(notification, payload, sender) {
        // once everybody is loaded up
        if(notification==="ALL_MODULES_STARTED"){
            // send our config to our node_helper
            this.sendSocketNotification("CONFIG",this.config)
        }
        if (sender) {
            Log.log(this.name + " received a module notification: " + notification + " from sender: " + sender.name);
        } else {
            Log.log(this.name + " received a system notification: " + notification);
        }
    },
*/
    // messages received from from your node helper (NOT other modules or the system)
    // payload is a notification dependent data structure, up to you to design between module and node_helper
    socketNotificationReceived: function(noti, payload) {
        if (noti == "UPDATE") {
            if (payload.hasOwnProperty('symbol')) {
                this.stocks[payload.symbol] = payload
                this.update(payload)
            }
        }
        //if (noti == "UPDATE_SERIES") {
        //    this.updateSeries(payload)
        //}
    },
/*
    socketNotificationReceived: function(notification, payload) {
        Log.log(this.name + " received a socket notification: " + notification + " - Payload: " + payload);
        if(notification === "message_from_helper"){
            this.config.message = payload;
            // tell mirror runtime that our data has changed,
            // we will be called back at GetDom() to provide the updated content
            this.updateDom(1000)
        }

    },
*/
    update: function(stock) {
        this.drawTable(stock)
    },

    drawTable: function(stock) {
        var hash = stock.hash
        var tr = document.getElementById("STOCK_" + hash)
        var ud = ""
        for (j = 1 ; j <= 5 ; j++) {
            var tdId = BusInfoHdr[j] + "_" + hash
            var td = document.getElementById(tdId)
            td.innerHTML = stock[BusInfoHdr[j]]
            td.className = BusInfoHdr[j]
            if (BusInfoHdr[j] == "change") {
                if (stock[BusInfoHdr[j]] > 0) {
                    ud = "up"
                } else if (stock[BusInfoHdr[j]] < 0) {
                    ud = " down"
                }
            }
        }
        tr.className = "animated stock " + ud
        var tl = document.getElementById("AVSTOCK_TAGLINE")
        tl.innerHTML = "Last updated: " + stock.requestTime
        setTimeout(()=>{
            tr.className = "stock " + ud
        }, 1500);
    },

    // system notification your module is being hidden
    // typically you would stop doing UI updates (getDom/updateDom) if the module is hidden
    suspend: function(){

    },

    // system notification your module is being unhidden/shown
    // typically you would resume doing UI updates (getDom/updateDom) if the module is shown
    resume: function(){

    },

    // this is the major worker of the module, it provides the displayable content for this module
    getDom: function() {
        var wrapper = document.createElement("div")
        wrapper.id = "AVSTOCK"
        return wrapper
    },

/*
    getDom: function() {
        var wrapper = document.createElement("div");

        // if user supplied message text in its module config, use it
        if(this.config.hasOwnProperty("message")){
            // using text from module config block in config.js
            wrapper.innerHTML = this.config.message;
        }
        else{
        // use hard coded text
            wrapper.innerHTML = "Hello world!";
        }

        // pass the created content back to MM to add to DOM.
        return wrapper;
    },
*/

    prepare: function() {
        this.prepareTable()
    },
/*
    getStockName: function(symbol) {
        var stockAlias = symbol
        var i = this.config.symbols.indexOf(symbol)
        if (this.config.symbols.length == this.config.alias.length) {
            stockAlias = (this.config.alias[i]) ? this.config.alias[i] : stockAlias
        }
        return stockAlias
    },
*/
    prepareTable: function() {
        var wrapper = document.getElementById("AVSTOCK")
        wrapper.innerHTML = ""

        var tbl = document.createElement("table")
        tbl.id = "AVSTOCK_TABLE"
        var thead = document.createElement("thead")
        var tr = document.createElement("tr")
        for (i in BusInfoHdr) {
            var td = document.createElement("td")
            td.innerHTML = BusInfoTitle[i]
            td.className = BusInfoHdr[i]
            tr.appendChild(td)
        }
        thead.appendChild(tr)
        tbl.appendChild(thead)

        for (i in this.config.symbols) {
            var stock = this.config.symbols[i]
            var hashId = stock.hashCode()
            var tr = document.createElement("tr")
            tr.className = "stock"
            tr.id = "STOCK_" + hashId
            for (j in BusInfoHdr) {
                var td = document.createElement("td")
                var stockAlias = stock
                td.innerHTML = (j != 0) ? "---" : stockAlias
                td.className = BusInfoHdr[j]
                td.id = BusInfoHdr[j] + "_" + hashId
                tr.appendChild(td)
            }
            tbl.appendChild(tr)
        }
        wrapper.appendChild(tbl)
        var tl = document.createElement("div")
        tl.className = "tagline"
        tl.id = "AVSTOCK_TAGLINE"
        tl.innerHTML = "Last updated : "
        wrapper.appendChild(tl)
    },
})
