const XLSX = require('xlsx');
const APPPATH = require('app-root-path');
const FS = require('fs');
const path = require('path');
const { map } = require('p-iteration');
const moment = require('moment');

const readSheet = async (fileName, expectedFields) => {

    var filePath = path.join(APPPATH + "/views/uploads/tmp", fileName);
    // var contents = FS.readFileSync(filePath);
    // let data = null
    let wb = XLSX.readFile(filePath);
    
    let sheetObject = new Object();
    await map(wb.SheetNames, async sheetName => {
        sheetObject[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
    })

    /**
     * Fill out fields that did not exist in the excel row
     */
    if(typeof expectedFields != 'undefined')
    {
        await map(wb.SheetNames, async sheetName => {
            await map(sheetObject[sheetName], async obj => {
                var final = expectedFields.filter(function(item) {
                    return !(Object.keys(obj)).includes(item);
                });

                if(final.length >0)
                {
                    final.forEach((keyName) => {
                        sheetObject[sheetName][keyName] = null;
                    });
                }
            });
        });
    }

    return sheetObject;
}

const readEmployeeDependents = async (fileName, expectedFields) => {
    var filePath = path.join(APPPATH + "/views/uploads/tmp", fileName);
    
    let wb = XLSX.readFile(filePath, {cellDates:true, cellNF: false, cellText:false});
    
    let sheetObject = new Object();
    await map(wb.SheetNames, async sheetName => {
        sheetObject[sheetName] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {dateNF:"YYYY-MM-DD"});
    })

    /**
     * Fill out fields that did not exist in the excel row
     */
    if(typeof expectedFields != 'undefined')
    {
        await map(wb.SheetNames, async sheetName => {
            await map(sheetObject[sheetName], async obj => {
                var final = expectedFields.filter(function(item) {
                    return !(Object.keys(obj)).includes(item);
                });

                if(final.length >0)
                {
                    final.forEach((keyName) => {
                        sheetObject[sheetName][keyName] = null;
                    });
                }
            });
        });
    }
    
    // if((Object.keys(sheetObject["Sheet1"][0])).includes("Dependent 1 First Name"))
    // {
        
        let filedSets = Object.keys(sheetObject["Sheet1"][1]);
        console.log('filedSets', filedSets);

        let counter = 0;
        let flag = true;
        let dependentsFields = new Array();

        while (flag) {
            counter = counter + 1;
            if(!filedSets.includes("Dependent "+counter+" First Name"))
            {
                flag = false;
            }
        }
        counter = counter - 1;

        /**
         * Fill out fields that did not exist in the excel row for dependents
         */
        let employeesContainer = new Object();
        for(let i = 1; i <= counter; i++)
        {
            dependentsFields = [
                "Dependent "+i+" First Name",
                "Dependent "+i+" Last Name",
                "Dependent "+i+" NRIC/FIN",
                "Dependent "+i+" Date of Birth",
                "Dependent "+i+" Relationship"
            ];
            await map(sheetObject["Sheet1"], async obj => {
                var final = dependentsFields.filter(function(item) {
                    return !(Object.keys(obj)).includes(item);
                });
    
                if(final.length >0)
                {
                    final.forEach((keyName) => {
                        sheetObject["Sheet1"][keyName] = null;
                    });
                }
            });
        }


        // extractor
        employeesContainer = new Object();
        employeesContainer.employees = [];
        let dependents = new Array();
        await map(sheetObject["Sheet1"], async obj => {
            tempEmployees = new Object();
            dependents = new Array();
            for(let i = 1; i <= counter; i++)
            {
                if(
                    typeof obj["Dependent "+i+" First Name"] != "undefined" &&
                    typeof obj["Dependent "+i+" Last Name"] != "undefined" &&
                    typeof obj["Dependent "+i+" NRIC/FIN"] != "undefined" &&
                    typeof obj["Dependent "+i+" Date of Birth"] != "undefined" &&
                    typeof obj["Dependent "+i+" Relationship"] != "undefined"
                )
                {
                    dependents.push({
                        first_name: obj["Dependent "+i+" First Name"],
                        last_name: obj["Dependent "+i+" Last Name"],
                        nric: obj["Dependent "+i+" NRIC/FIN"],
                        dob: obj["Dependent "+i+" Date of Birth"],
                        relationship: obj["Dependent "+i+" Relationship"]
                    });
                }
            }

            if(obj["Last Name"] != null && obj["First Name"] != null) {
                employeesContainer.employees.push({
                    dependents: dependents,
                    dob: obj["Date of Birth (DD/MM/YYYY)"],
                    email: obj["Work Email"],
                    first_name: obj["First Name"],
                    job_title: "Others",
                    last_name: obj["Last Name"],
                    medical_credits: obj["Medical Credits"],
                    mobile: obj["Mobile"],
                    nric: obj["NRIC/FIN"],
                    plan_start: obj["Start Date (DD/MM/YYYY)"],
                    postal_code: obj["Postal Code"],
                    wellness_credits: obj["Wellness Credits"]
                })
            }
        });
        

    // }
    return employeesContainer;

}

module.exports = {
    readSheet,
    readEmployeeDependents
};