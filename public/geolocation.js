const user_location_fields = {};

function activate_user_location_input(nm, longorlat, active) {
  user_location_fields[longorlat] = nm;
  const cls =
    "btn btn-sm " + (active ? "btn-secondary" : "btn-outline-secondary");
  if (!$("button#user-locator-activate").length) {
    $("input[name=" + nm + "]").after(
      '<button type="button" id="user-locator-activate" class="' +
        cls +
        '" onclick="click_user_location_input()">Locate</button>'
    );
  }
}

function click_user_location_input() {
  navigator.geolocation.getCurrentPosition(function (pos) {
    $("input[name=" + user_location_fields.lat + "]").val(pos.coords.latitude);
    $("input[name=" + user_location_fields.long + "]").val(
      pos.coords.longitude
    );
    $("button#user-locator-activate")
      .removeClass("btn-outline-secondary")
      .addClass("btn-secondary");
  }, geoLocationError);
}

function geoLocationError(e) {
  let txt = "";
  const _geoloc_is_Android = /(android)/i.test(navigator.userAgent);
  const _geoloc_is_iOS =
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);

  if (_geoloc_is_iOS) {
    txt =
      "Geolocation error: " +
      e.message +
      "<br>To enable geolocation on iOS, go to Device settings, Privacy, and enable Location services for your browser";
  } else if (_geoloc_is_Android) {
    txt =
      "Geolocation error: " +
      e.message +
      "<br>To enable geolocation on Android, go to Device settings, Location, and enable for your browser";
  } else txt = "Geolocation error: " + e.message + "";

  notifyAlert({
    type: "danger",
    text: txt,
  });
}
