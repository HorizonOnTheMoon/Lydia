import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createMint, getMint } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

const DEVNET_RPC = "https://api.devnet.solana.com";

async function main() {
  console.log("🚀 Setting up Commodity Token Mints on Devnet...\n");

  // Load wallet
  const walletPath = path.join(
    process.env.HOME!,
    ".config/solana/id.json"
  );
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("👛 Wallet:", walletKeypair.publicKey.toBase58());

  const connection = new Connection(DEVNET_RPC, "confirmed");

  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("💰 Balance:", balance / 1e9, "SOL\n");

  if (balance < 1e9) {
    console.log("⚠️  Low balance! Run: solana airdrop 2");
    process.exit(1);
  }

  // PDA for pool
  const programId = new PublicKey("HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8");
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId
  );

  console.log("📦 Pool PDA:", poolPda.toBase58());
  console.log("   (This will be the mint authority for all commodity tokens)\n");

  // Create mints with pool as authority
  console.log("🏭 Creating Commodity Token Mints...\n");

  const oilMint = await createMint(
    connection,
    walletKeypair,
    poolPda, // Pool will be mint authority
    null,
    6
  );
  console.log("✅ Oil Mint:", oilMint.toBase58());

  const goldMint = await createMint(
    connection,
    walletKeypair,
    poolPda,
    null,
    6
  );
  console.log("✅ Gold Mint:", goldMint.toBase58());

  const silverMint = await createMint(
    connection,
    walletKeypair,
    poolPda,
    null,
    6
  );
  console.log("✅ Silver Mint:", silverMint.toBase58());

  const naturalGasMint = await createMint(
    connection,
    walletKeypair,
    poolPda,
    null,
    6
  );
  console.log("✅ Natural Gas Mint:", naturalGasMint.toBase58());

  // USDC Devnet mint (official)
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  console.log("\n💵 USDC Devnet Mint:", usdcMint.toBase58());
  console.log("   (Official USDC Devnet mint)");

  // Verify USDC mint exists
  try {
    const usdcInfo = await getMint(connection, usdcMint);
    console.log("   Decimals:", usdcInfo.decimals);
  } catch (e) {
    console.log("   ⚠️  Using standard devnet USDC");
  }

  // Save to file
  const config = {
    usdcMint: usdcMint.toBase58(),
    oilMint: oilMint.toBase58(),
    goldMint: goldMint.toBase58(),
    silverMint: silverMint.toBase58(),
    naturalGasMint: naturalGasMint.toBase58(),
    poolPda: poolPda.toBase58(),
  };

  const configPath = path.join(__dirname, "..", "mints-config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log("\n📝 Config saved to:", configPath);
  console.log("\n✨ Setup complete! Add these to your constants.rs:");
  console.log("\n--- Copy to src/constants.rs ---\n");
  console.log(`// Devnet USDC (official)
pub const USDC_MINT: &str = "${usdcMint.toBase58()}";

// Commodity Token Mints (Pool is mint authority)
pub const OIL_MINT: &str = "${oilMint.toBase58()}";
pub const GOLD_MINT: &str = "${goldMint.toBase58()}";
pub const SILVER_MINT: &str = "${silverMint.toBase58()}";
pub const NATURAL_GAS_MINT: &str = "${naturalGasMint.toBase58()}";
`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
