angular.module("patientPickerApp.branding", [], ["$provide", function($provide) {

    $provide.value("brandedText", {
            hspc: {
                mainTitle: "Patient Picker",
                copyright: "© 2016 by Healthcare Services Platform Consortium",
                showCert: true
            },
            smart: {
                mainTitle: "Patient Chooser",
                copyright: "© Harvard Medical School / Boston Children's Hospital / SMART Health IT, 2016",
                showCert: false
            }
    });
}]);