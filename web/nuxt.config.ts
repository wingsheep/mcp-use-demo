import { defineNuxtConfig } from "nuxt/config"

export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  ssr: false,
  css: ["~/assets/css/main.css", "markstream-vue/index.css"],
  colorMode: {
    preference: "light",
    fallback: "light",
    classSuffix: ""
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || ""
    }
  }
})
