const axios = require("axios");
const NodeHelper = require("node_helper");

const TDX_AUTH_URL =
    "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const TDX_BUS_ETA_URL =
    "https://tdx.transportdata.tw/api/basic/v2/Bus/EstimatedTimeOfArrival/City";

module.exports = NodeHelper.create({
    start: function () {
        console.log("[MMM-TwBusEta] Node helper started.");
        this.config = null;
        this.token = null;
        this.tokenExpiry = 0;
        this.timer = null;
    },

    stop: function () {
        console.log("[MMM-TwBusEta] Node helper stopping.");
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },

    socketNotificationReceived: function (noti, payload) {
        if (noti === "INIT") {
            this.config = payload;
            console.log("[MMM-TwBusEta] Config received.");
        }
        if (noti === "START") {
            this.startPolling();
        }
    },

    startPolling: function () {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.fetchAllRoutes();
        this.scheduleNextPoll();
    },

    scheduleNextPoll: function () {
        var interval = this.config.updateInterval || 60000;
        this.timer = setTimeout(() => {
            this.fetchAllRoutes();
            this.scheduleNextPoll();
        }, interval);
    },

    fetchAllRoutes: async function () {
        if (!this.config || !this.config.routes) return;

        for (var i = 0; i < this.config.routes.length; i++) {
            var route = this.config.routes[i];
            try {
                await this.fetchRouteEta(route);
            } catch (err) {
                console.error("[MMM-TwBusEta] Error fetching route " + route.routeName + ":", err.message);
                this.sendSocketNotification("ERROR", {
                    message: "無法取得 " + route.routeName + " 路線資料",
                });
            }
        }
    },

    getAccessToken: async function () {
        var now = Date.now();
        if (this.token && now < this.tokenExpiry) {
            return this.token;
        }

        if (!this.config.clientId || !this.config.clientSecret) {
            return null;
        }

        try {
            var response = await axios.post(
                TDX_AUTH_URL,
                new URLSearchParams({
                    grant_type: "client_credentials",
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                }).toString(),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
            this.token = response.data.access_token;
            this.tokenExpiry = now + (response.data.expires_in - 60) * 1000;
            return this.token;
        } catch (err) {
            console.error("[MMM-TwBusEta] Auth failed:", err.message);
            this.token = null;
            this.tokenExpiry = 0;
            throw new Error("TDX 認證失敗，請檢查 clientId / clientSecret");
        }
    },

    fetchRouteEta: async function (route) {
        var url = TDX_BUS_ETA_URL + "/" + route.city + "/" + encodeURIComponent(route.routeName)
            + "?$filter=Direction eq " + route.direction
            + "&$orderby=StopSequence asc"
            + "&$format=JSON";

        var headers = {};
        var token = await this.getAccessToken();
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        var response = await axios.get(url, { headers: headers });
        var data = response.data;

        if (!Array.isArray(data)) {
            console.warn("[MMM-TwBusEta] Unexpected response format for " + route.routeName);
            return;
        }

        var lang = this.config.language || "Zh_tw";
        var stops = data.map(function (item) {
            return {
                stopSequence: item.StopSequence,
                stopName: (item.StopName && item.StopName[lang]) || item.StopName.Zh_tw || "",
                estimateTime: item.EstimateTime != null ? item.EstimateTime : null,
                stopStatus: item.StopStatus,
            };
        });

        stops.sort(function (a, b) {
            return a.stopSequence - b.stopSequence;
        });

        this.sendSocketNotification("ETA_DATA", {
            city: route.city,
            routeName: route.routeName,
            direction: route.direction,
            stops: stops,
        });
    },
});
