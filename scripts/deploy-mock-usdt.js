const hre = require('hardhat');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
      out[key.toLowerCase()] = true;
    } else {
      out[key] = next;
      out[key.toLowerCase()] = next;
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mintTo =
    process.env.MINT_TO ||
    args.mintTo ||
    args.mintto ||
    args.to ||
    '';
  const mintUsdt =
    process.env.MINT_USDT ||
    args.mintUsdt ||
    args.mintusdt ||
    args.amountUsdt ||
    args.amountusdt ||
    '1000';

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error(
      'No deployer account. Set DEPLOYER_PRIVATE_KEY in your environment (and fund it with Arbitrum Sepolia ETH for gas).'
    );
  }

  const owner = deployer.address;
  console.log('[MockUSDT] network:', hre.network.name);
  console.log('[MockUSDT] deployer:', owner);

  const Factory = await hre.ethers.getContractFactory('MockUSDT');
  const token = await Factory.deploy(owner);
  await token.waitForDeployment();

  const tokenAddress = await token.getAddress();
  console.log('[MockUSDT] deployed:', tokenAddress);

  const recipient = mintTo || owner;
  const decimals = 6n;
  const [intPart, fracPartRaw = ''] = String(mintUsdt).trim().split('.');
  const fracPart = (fracPartRaw + '0'.repeat(Number(decimals))).slice(0, Number(decimals));
  const amountRaw = BigInt(intPart || '0') * 10n ** decimals + BigInt(fracPart || '0');

  const tx = await token.mint(recipient, amountRaw);
  const receipt = await tx.wait();
  console.log('[MockUSDT] minted', mintUsdt, 'to', recipient, 'tx', receipt?.hash || tx.hash);

  console.log('\nSet this in .env.local (frontend):');
  console.log(`NEXT_PUBLIC_ARBITRUM_SEPOLIA_USDT_ADDRESS=${tokenAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

