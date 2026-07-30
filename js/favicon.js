(() => {
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = "img/simple_logo.png";

    document.head.appendChild(favicon);
})();
