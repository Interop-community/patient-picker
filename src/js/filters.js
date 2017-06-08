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
    return function (p) {
        if (p.resourceType === "Patient") {
            var patientName = p && p.name && p.name[0];
            if (!patientName) return null;

            // FHIR 3.0 updated family names to be 0..1 instead of 0..*
            if(!Array.isArray(patientName.family)){
                patientName.family = [patientName.family];
            }

            return patientName.given.join(" ") + " " + patientName.family.join(" ");
        } else {
            var practitionerName = p && p.name;
            if (!practitionerName) return null;

            // FHIR 3.0 updated family names to be 0..1 instead of 0..*
            if(!Array.isArray(practitionerName.family)){
                practitionerName.family = [practitionerName.family];
            }

            var practitioner = practitionerName.given.join(" ") + " " + practitionerName.family.join(" ");
            if (practitionerName.suffix) {
                practitioner = practitioner + ", " + practitionerName.suffix.join(", ");
            }
            return practitioner;
        }
    };
}).filter('nameFamilyGiven', function () {
    return function (p) {
        if (p.resourceType === "Patient") {
            var patientName = p && p.name && p.name[0];
            if (!patientName) return null;

            // FHIR 3.0 updated family names to be 0..1 instead of 0..*
            if(!Array.isArray(patientName.family)){
                patientName.family = [patientName.family];
            }

            return patientName.family.join(" ") + ", " + patientName.given.join(" ");
        } else {
            var practitionerName = p && p.name;
            if (!practitionerName) return null;

            // FHIR 3.0 updated family names to be 0..1 instead of 0..*
            if(!Array.isArray(practitionerName.family)){
                practitionerName.family = [practitionerName.family];
            }

            var practitioner = practitionerName.family.join(" ") + ", " + practitionerName.given.join(" ");
            if (practitionerName.suffix) {
                practitioner = practitioner + ", " + practitionerName.suffix.join(", ");
            }
            return practitioner;
        }
    };
}).filter('ageFilter', function () {
    return function(dob) {
        // var dob = patient.birthDate;
        if (!dob) return "";

        //fix year or year-month style dates
        if (/\d{4}$/.test(dob))
            dob = dob + "-01";
        if (/\d{4}-d{2}$/.test(dob))
            dob = dob + "-01";

        return moment(dob).fromNow(true)
            .replace("a ", "1 ")
            .replace(/minutes?/, "min");
    }
}).filter('capFilter', function () {
    return function(input) {
        return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
    }
});
