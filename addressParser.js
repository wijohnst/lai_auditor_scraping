const addressData = require('./addresses.json');

const parseAddresses = () => {
  console.log('Parsing addresses...');

  const { Records: records } = addressData;
  const livingstonAddresses = records.filter((record) => {
    const streetAddressArr = record.Address.split(' ');
    if (streetAddressArr.includes('Ave')) {
      return record;
    }
  });

  const streetNumbersAll = livingstonAddresses.map((address) =>
    Number(address.Number)
  );

  const minStreetNumber = 769; // 18th & Livingston
  const maxStreetNumber = 1937; // Livingston & Alum Creek

  const validStreetNumbers = streetNumbersAll.filter(
    (streetNumber) =>
      streetNumber >= minStreetNumber && streetNumber <= maxStreetNumber
  );

  // return validStreetNumbers.slice(0, 10);
  return [validStreetNumbers[0], validStreetNumbers[1], validStreetNumbers[2]];
};

module.exports = parseAddresses;
