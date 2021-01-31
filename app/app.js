import Vue from "nativescript-vue";

import Home from "./components/Home";

require("@nota/nativescript-webview-ext/vue");

Vue.config.silent = false;

new Vue({
    render: h => h("frame", [h(Home)])
}).$start();
