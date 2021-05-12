const uuidv4 = require('uuid/v4');
const moment = require('moment');
const moment_timezone = require('moment-timezone');
const APPPATH = require('app-root-path');
const mongoose = require(`${APPPATH}/server/lib/mongoose`);

const threshold = 1968,
    checksumArr_ST = ['J', 'Z', 'I', 'H', 'G', 'F', 'E', 'D', 'C', 'B', 'A'],
    checksumArr_FG = ['X', 'W', 'U', 'T', 'R', 'Q', 'P', 'N', 'M', 'L', 'K'];
    
const createUuID = async () => {
  return moment().format("x") + "-" + uuidv4();
}

const createDate = async () => {
  // let created_At = moment_timezone().tz("Asia/Singapore");
    // let updated_At = moment_timezone().tz("Asia/Singapore");
    let created_At = moment().format("YYYY-MM-DD HH:mm:ss");
    
    return {
      created_at: created_At,
      updated_at: created_At
    }
}

const checkNRIC = async (ic) => {
    ic = ic.trim().toUpperCase();
    if (
      !/^[S|T]\d{7}[J|Z|I|H|G|F|E|D|C|B|A]|[F|G]\d{7}[X|W|U|T|R|Q|P|N|M|L|K]$/.test(
        ic
      )
    ) {
      return 0;
    }
    const prefix = ic[0].toUpperCase();
    const number = ic.slice(1, -1);
    const oldChecksum = ic.slice(-1).toUpperCase();
    return oldChecksum === checksum(prefix, number) ? 1 : -1;
}

const checksum = async (prefix, number) => {
    function stringToSum(number) {
      const multiplyFactors = [2, 7, 6, 5, 4, 3, 2];
      return number
        .split('')
        .map(s => parseInt(s))
        .map((digit, i) => digit * multiplyFactors[i])
        .reduce((a, b) => a + b, 0);
    }
    prefix = prefix.toUpperCase();
    let sum = 0;
    if (prefix === 'T' || prefix === 'G') sum = 4; // an offset if start with T/G
    sum += stringToSum(number);
    switch (prefix) {
      case 'S':
      case 'T':
        return checksumArr_ST[sum % 11];
      case 'F':
      case 'G':
        return checksumArr_FG[sum % 11];
      default:
        throw new Error('Invalid Prefix detected');
    }
}

const getId = async (model, id) => {
  return await mongoose.getPrimaryID(model, id, { });
}

module.exports = {
    createUuID,
    createDate,
    checkNRIC,
    getId
};