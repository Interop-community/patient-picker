'use strict';

/* Filters */

angular.module('patientPickerApp.filters', []).filter('formatAttribute', function ($filter) {
        return function (input) {
            if (Object.prototype.toString.call(input) === '[object Date]') {
                return $filter('date')(input, 'MM/dd/yyyy HH:mm');
            } else {
                return input;
            }
        };
}).filter('nameGivenFamily', function () {
        return function(p){
            if (p.resourceType === "Patient") {
                var patientName = p && p.name && p.name[0];
                if (!patientName) return null;

                return patientName.given.join(" ") + " " + patientName.family.join(" ");
            } else {
                var practitionerName = p && p.name;
                if (!practitionerName) return null;

                var practitioner =  practitionerName.given.join(" ") + " " + practitionerName.family.join(" ");
                if (practitionerName.suffix) {
                    practitioner = practitioner + ", " + practitionerName.suffix.join(", ");
                }
                return practitioner;
            }
        };
    }).filter('nameFamilyGiven', function () {
        return function(p){
            if (p.resourceType === "Patient") {
                var patientName = p && p.name && p.name[0];
                if (!patientName) return null;

                return patientName.family.join(" ") + ", " + patientName.given.join(" ");
            } else {
                var practitionerName = p && p.name;
                if (!practitionerName) return null;

                var practitioner =  practitionerName.family.join(" ") + ", " + practitionerName.given.join(" ");
                if (practitionerName.suffix) {
                    practitioner = practitioner + ", " + practitionerName.suffix.join(", ");
                }
                return practitioner;
            }
        };
    });

