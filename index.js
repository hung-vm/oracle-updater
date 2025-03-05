const fs = require("fs");
const csv = require("csv-parse");
const iconv = require("iconv-lite");
const BigNumber = require("bignumber.js");
const ethers = require("ethers");
const { JsonRpcProvider } = require("@ethersproject/providers");
const oracleAbi = require("./Oracle.json");

async function main() {
  const signerPrivateKey = ""; // TODO: Change me
  const rpcUrl = "https://rpc.defi-verse.org/";

  const oracleContractAddress = "0xd967c8c063B9610254CCFB5Bf697f3e43E25ea34"; // DefiVerse Oracle
  const batchSize = 10;
  const dataFile = "./data.csv";

  if (!signerPrivateKey) {
    console.log("ERROR: You must edit signerPrivateKey");
    return;
  }

  console.log("Oracle updater -> Start");

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(signerPrivateKey, provider);
  const oracleContract = new ethers.Contract(
    oracleContractAddress,
    oracleAbi,
    signer
  );

  console.log(
    `\tFile: ${dataFile}, batch size: ${batchSize}, rpcUrl:${rpcUrl}, signer: ${signer.address}`
  );

  const data = await parseCsv(dataFile);

  let from = 0;
  let to = 0;
  let list = [];
  do {
    to = Math.min(from + batchSize, data.length);
    list = data.slice(from, to);
    if (list.length > 0) {
      const users = [];
      const tokens = [];
      const amounts = [];
      for (let i = 0; i < list.length; i++) {
        const decimals = 18;

        users.push(list[i].wallet);
        tokens.push(list[i].token);

        const amt = new BigNumber(list[i].amount).times(10 ** decimals);
        amounts.push(amt.toFixed(0));
      }

      console.log(`oracleContract -> subEarnBatch users:`, users);

      const rs = await oracleContract.subEarnBatch(users, tokens, amounts, {
        gasLimit: "300000",
        gasPrice: "10000000000000",
      });

      console.log(`\ttx:`, rs.hash);
    }

    from = to;
  } while (list && list.length > 0);
  console.log("Oracle updater -> Done!");
}

async function parseCsv(file, encoding = "UTF-8") {
  return new Promise((resolve, reject) => {
    const data = fs.readFileSync(file);
    const text = iconv.decode(Buffer.from(data, "binary"), encoding);

    csv.parse(
      text,
      {
        columns: true,
        skip_empty_lines: true,
      },
      (err, records) => {
        if (err) {
          reject(err);
        } else {
          resolve(records);
        }
      }
    );
  });
}

main();
