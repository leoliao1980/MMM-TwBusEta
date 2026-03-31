Module.register("MMM-TwBusEta", {
    defaults: {
        clientId: "",
        clientSecret: "",
        routes: [
            { city: "Taipei", routeName: "254", direction: 0 },
        ],
        updateInterval: 60 * 1000,
        maxStops: 10,
        language: "Zh_tw",
    },

    DIRECTION_LABEL: { 0: "去程", 1: "返程" },
    STOP_STATUS: {
        0: null,
        1: "尚未發車",
        2: "交管不停靠",
        3: "末班車已過",
        4: "今日未營運",
    },

    getStyles: function () {
        return ["MMM-TwBusEta.css"];
    },

    start: function () {
        Log.log(this.name + " is starting.");
        this.etaData = {};
        this.lastUpdated = null;
        this.loaded = false;
        this.error = null;

        this.sendSocketNotification("INIT", this.config);
    },

    notificationReceived: function (noti) {
        if (noti === "DOM_OBJECTS_CREATED") {
            this.sendSocketNotification("START");
        }
    },

    socketNotificationReceived: function (noti, payload) {
        switch (noti) {
            case "ETA_DATA":
                this.processEtaData(payload);
                break;
            case "ERROR":
                this.error = payload.message;
                Log.error(this.name + ": " + payload.message);
                this.updateDom();
                break;
        }
    },

    processEtaData: function (payload) {
        var key = payload.city + "_" + payload.routeName + "_" + payload.direction;
        this.etaData[key] = payload;
        this.lastUpdated = new Date();
        this.loaded = true;
        this.error = null;
        this.updateDom(500);
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.className = "tw-bus-eta";

        if (this.error) {
            wrapper.innerHTML = '<div class="bus-error">' + this.error + "</div>";
            return wrapper;
        }

        if (!this.loaded) {
            wrapper.innerHTML = '<div class="bus-loading">載入公車資料中...</div>';
            return wrapper;
        }

        for (var i = 0; i < this.config.routes.length; i++) {
            var route = this.config.routes[i];
            var key = route.city + "_" + route.routeName + "_" + route.direction;
            var data = this.etaData[key];

            var section = this.buildRouteSection(route, data);
            wrapper.appendChild(section);
        }

        if (this.lastUpdated) {
            var footer = document.createElement("div");
            footer.className = "bus-footer dimmed";
            var time = this.lastUpdated.toLocaleTimeString("zh-TW", {
                hour: "2-digit",
                minute: "2-digit",
            });
            footer.innerHTML = "更新時間: " + time;
            wrapper.appendChild(footer);
        }

        return wrapper;
    },

    buildRouteSection: function (route, data) {
        var section = document.createElement("div");
        section.className = "bus-route-section";

        var header = document.createElement("div");
        header.className = "bus-route-header";
        var dirLabel = this.DIRECTION_LABEL[route.direction] || "";
        header.innerHTML = route.routeName + " <span class='bus-direction'>" + dirLabel + "</span>";
        section.appendChild(header);

        if (!data || !data.stops || data.stops.length === 0) {
            var empty = document.createElement("div");
            empty.className = "bus-no-data dimmed";
            empty.innerHTML = "無資料";
            section.appendChild(empty);
            return section;
        }

        var table = document.createElement("table");
        table.className = "bus-table small";

        var stops = data.stops.slice(0, this.config.maxStops);
        for (var i = 0; i < stops.length; i++) {
            var stop = stops[i];
            var tr = document.createElement("tr");

            var tdName = document.createElement("td");
            tdName.className = "bus-stop-name";
            tdName.innerHTML = stop.stopName;
            tr.appendChild(tdName);

            var tdEta = document.createElement("td");
            tdEta.className = "bus-eta";
            var etaInfo = this.formatEta(stop);
            tdEta.innerHTML = etaInfo.text;
            tdEta.classList.add(etaInfo.cls);
            tr.appendChild(tdEta);

            table.appendChild(tr);
        }
        section.appendChild(table);
        return section;
    },

    formatEta: function (stop) {
        if (stop.stopStatus !== 0) {
            return {
                text: this.STOP_STATUS[stop.stopStatus] || "未知狀態",
                cls: "bus-eta-inactive",
            };
        }
        if (stop.estimateTime == null) {
            return { text: "未發車", cls: "bus-eta-inactive" };
        }
        var minutes = Math.floor(stop.estimateTime / 60);
        if (minutes <= 1) {
            return { text: "即將進站", cls: "bus-eta-arriving" };
        }
        return { text: minutes + " 分", cls: "bus-eta-normal" };
    },
});
