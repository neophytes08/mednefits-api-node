require('express-async-errors');
const APPPATH = require('app-root-path');
// const mongoose = require(`${APPPATH}/server/lib/mongoose`);
// const awsDynamoDB = require(APPPATH + '/server/lib/aws.dynamo.schema');
const { map } = require('p-iteration');
const _ = require('lodash');
const getSubAccountsID = async (memberID, res) => {

    let memberIds = (typeof memberID == "array" ? memberID : [memberID]);

    let member = await awsDynamoDB.getItemEqual({
        table: "medi_members",
        conditions: [
            {
                in: {
                    whereField: "member_id",
                    whereValue: memberIds
                }
            }
        ]
    });

    // let member = await awsDynamoDB.getItemPartition({
    //     table: "medi_members",
    //     indexName: "MemberIdIndex",
    //     indexValue: memberID,
    //     limit: 1
    // });

    let ids = memberIds;
    // let ids = new Array();

    // ids.push(memberID);

    if(member.Count > 0)
    {
        let arrEmployees = new Array();
        let arrDependents = new Array();

        _.map(member, memberElement => {
            if(memberElement.attrs.member_type == "employee")
            {
                arrEmployees = [...arrEmployees,memberElement.attrs.member_id]
            }
            else if(memberElement.attrs.member_type == "dependents")
            {
                arrEmployees = [...arrEmployees,memberElement.attrs.member_id]
            }
        })

        member = member.Items[0].attrs;

        if(member.member_type == "employee")
        {
            // let results = await awsDynamoDB.getItemPartition({
            //     table: "medi_member_covered_dependents",
            //     indexName: "OwnerIdIndex",
            //     indexValue: memberID
            // });

            let results = await awsDynamoDB.getItemEqual({
                table: "medi_member_covered_dependents",
                conditions: [
                    {
                        in: {
                            whereField: "id",
                            whereValue: arrEmployees
                        }
                    }
                ]
            });
            
            // await map(results.Items, async result => {
            //     result = result.attrs;
            //     if(result.member_id != memberID)
            //     {
            //         ids.push(result.member_id);
            //     }
            // });
            
            if(results.Count > 0)
            {
                await map(results.Items, async result => {
                    result = result.attrs;
                    if(arrEmployees.includes(result.member_id))
                    {
                        ids.push(result.member_id);
                    }
                });
            }
        
        }
        
        if(member.member_type == "dependents")
        {

            // let owner = await awsDynamoDB.getItemPartition({
            //     table: "medi_member_covered_dependents",
            //     indexName: "OwnerIdIndex",
            //     indexValue: memberID,
            //     attributes: ["owner_id"],
            //     limit: 1
            // });
            let owner = await awsDynamoDB.getItemEqual({
                table: "medi_member_covered_dependents",
                conditions: [
                    {
                        in: {
                            whereField: "owner_id",
                            whereValue: arrDependents
                        }
                    }
                ],
                attributes: ["owner_id"]
            });

            if(owner.Count > 0)
            {

                owner = _.uniqBy(owner, function (element) {
                    return element.attrs.owner_id;
                });

                owner = _.map(owner, ownerElement => {
                    return ownerElement.owner_id;
                })

            }

            // let results = await awsDynamoDB.getItemPartition({
            //     table: "medi_member_covered_dependents",
            //     indexName: "OwnerIdIndex",
            //     indexValue: owner.Items[0].attrs.owner_id
            // });

            let results = await awsDynamoDB.getItemEqual({
                table: "medi_member_covered_dependents",
                conditions: [
                    {
                        in: {
                            whereField: "owner_id",
                            whereValue: owner
                        }
                    }
                ]
            });

            let idsElement = null;
            if(results.Count > 0)
            {
                idsElement = _.map(results, resultsElement => {
                    return resultsElement.attrs.owner_id;
                })
            
                ids = [...ids,idsElement]
                // ids.push(owner.Items[0].attrs.owner_id);
                
                
                await map(results.Items, async result => {
                    if(!arrDependents.contains(result.member_id))
                    {
                        ids.push(results.member_id);
                    }
                });
                // await map(results.Items, async result => {
                //     if(result.member_id != memberID)
                //     {
                //         ids.push(member_id);
                //     }
                // });
            }
        }
    }

    return ids;
}

const checkUserType = async (id, res) => 
{
    let result = await awsDynamoDB.getItemEqual({
        table: "medi_members",
        indexValue: id,
        limit: 1
    }, res);

    result = result.Items[0].attrs;
    
    return {
        user_type: result.source_type,
        access_type: result.access_type
    }
}

const getUserId = async (id, res) =>
{
    let result = await awsDynamoDB.getItemPartition({
        table: "medi_members",
        indexValue: id,
        limit: 1
    });
    result = result.Items[0].attrs;
    let userId = null;

    if(parseInt(result.member_type) == 5 && (parseInt(result.access_type) == 0 || parseInt(result.access_type) == 1))
    {
        userId = id;
    }
    else if(parseInt(result.member_type) == 5 && (parseInt(result.access_type) == 5 || parseInt(result.access_type) == 3))
    {
        let owner = await awsDynamoDB.getItemEqual({
            table: "medi_member_covered_dependents",
            conditions: {
                whereField: "member_id",
                whereValue: id
            },
            limit: 1
        }); 
        userId = owner.Items[0].attrs.member_id;
    }

    return userId;
}

const liteCompanyPlanStatus = async (customerId, res) => {
    
    let plan = await awsDynamoDB.getItemEqual({
        table: "medi_customer_plans",
        conditions: {
            whereField: "customer_id",
            whereValue: customerId
        },
        descending: true,
        limit: 1
    });

    if(plan.Count > 0)
    {
        plan = plan.Items[0].attrs;
        if(plan.account_type === "lite_plan" || plan.account_type === "insurance_bundle" && plan.secondary_account_type === "insurance_bundle_lite" || plan.account_type === "trial_plan" && plan.secondary_account_type === "trial_plan_lite") {
            return true;
        } else {
            return false;
        }
    }
    else
    {
        return false;
    }
    // $plan = DB::table('customer_plan')->where('customer_buy_start_id', $customer_id)->orderBy('created_at', 'desc')->first();
}

const splitName = async (str) => {
    var first_name = null;
    var last_name = null;

    var arr = str.split(' ');
    if( arr.length === 1 ) {
        first_name = arr[0];
    } else {
        first_name = arr.slice(0, -1).join(' ');
    }


    var arr = str.split(' ');
    if(arr.length === 1) {
        last_name = str;
    } else {
        last_name = arr.slice(-1).join(' ');
    }
    return { first_name: first_name, last_name: last_name };
}

const accountType = async (type) => {
    let planName = null;
    if(type == 'stand_alone_plan') {
        planName = "Pro Plan";
    } else if(type == 'insurance_bundle') {
        planName = "Insurance Bundle";
    } else if(type == 'trial_plan'){
        planName = "Trial Plan";
    } else if(type == 'lite_plan') {
        planName = "Lite Plan";
    }

    return planName;
}

const nestedToDotNotation = async(obj, keyPrefix) => {
    var result;
    if (keyPrefix == null) {
      keyPrefix = '';
    }
    result = {};
    _.each(obj, function(value, key) {
      var nestedObj, result_key;
      result_key = keyPrefix + '.' + key;
      // if (!_.isArray(value) && _.isObject(value)) {
      //   result_key += '.';
      //   nestedObj = module.exports.nestedToDotNotation(value, result_key);
      //   return _.extend(result, nestedObj);
      // } else {
        return result[result_key] = value;
      // }
    });
    return result;
}

module.exports = {
    getSubAccountsID,
    checkUserType,
    getUserId,
    liteCompanyPlanStatus,
    splitName,
    accountType,
    nestedToDotNotation
}