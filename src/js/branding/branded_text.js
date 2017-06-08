angular.module("patientPickerApp.branding", [], ["$provide", function($provide) {

    $provide.value("brandedText", {
        branded: {
                mainTitle: "Patient Picker",
                copyright: "© 2016 by Healthcare Services Platform Consortium",
                showCert: true
            }
    });
}]);