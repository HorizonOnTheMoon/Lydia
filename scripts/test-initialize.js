const anchor = require("@coral-xyz/anchor");
const { TOKEN_PROGRAM_ID, createAccount } = require("@solana/spl-token");
const { PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const fs = require("fs");

async function main() {
  console.log("🧪 Testing Lydia Commodity Swap\n");

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load IDL
  const idl = JSON.parse(
    fs.readFileSync("./target/idl/lydia_commodity_swap.json", "utf-8")
  );

  const programId = new PublicKey("HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8");
  const program = new anchor.Program(idl, programId, provider);

  // Hardcoded mint addresses
  const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const OIL_MINT = new PublicKey("AigaX4V7Wx7SPDC9Wc3zTkrCkWF1nQGEa8G2fUmLtGoH");
  const GOLD_MINT = new PublicKey("DbMEk1Fyb7KE34foshKbbB8D9BLfy3jEFFR4WUkdST4R");
  const SILVER_MINT = new PublicKey("Ay5iazmqsYhGZMvgVkELBKUQSqnbs7LxtjpHet29nCA3");
  const NATURAL_GAS_MINT = new PublicKey("BZognty8N6LiLKCrEGLP3hbqef8LFrYfK3SbNSZgqGQe");

  // Find pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId
  );

  console.log("📋 Configuration:");
  console.log("  Program ID:", programId.toBase58());
  console.log("  Pool PDA:", poolPda.toBase58());
  console.log("  Wallet:", provider.wallet.publicKey.toBase58());
  console.log();

  // Check if pool already exists
  try {
    const poolAccount = await program.account.commodityPool.fetch(poolPda);
    console.log("✅ Pool already initialized!");
    console.log("  Authority:", poolAccount.authority.toBase58());
    console.log("  USDC Vault:", poolAccount.usdcVault.toBase58());
    console.log("  Oil Mint:", poolAccount.oilMint.toBase58());
    console.log("  Gold Mint:", poolAccount.goldMint.toBase58());
    console.log("  Silver Mint:", poolAccount.silverMint.toBase58());
    console.log("  Natural Gas Mint:", poolAccount.naturalGasMint.toBase58());
    console.log();
    console.log("🔗 Explorer:", `https://explorer.solana.com/address/${poolPda.toBase58()}?cluster=devnet`);
    return;
  } catch (e) {
    console.log("📦 Pool not found. Initializing...\n");
  }

  // Create USDC vault
  const vaultKeypair = Keypair.generate();
  console.log("Creating USDC vault:", vaultKeypair.publicKey.toBase58());

  await createAccount(
    provider.connection,
    provider.wallet.payer,
    USDC_MINT,
    poolPda, // Pool is the owner
    vaultKeypair
  );
  console.log("✅ Vault created\n");

  // Initialize pool
  console.log("Initializing pool...");
  const tx = await program.methods
    .initialize()
    .accounts({
      pool: poolPda,
      authority: provider.wallet.publicKey,
      usdcVault: vaultKeypair.publicKey,
      usdcMint: USDC_MINT,
      oilMint: OIL_MINT,
      goldMint: GOLD_MINT,
      silverMint: SILVER_MINT,
      naturalGasMint: NATURAL_GAS_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("✅ Pool initialized!");
  console.log("  Transaction:", tx);
  console.log();

  // Fetch and display pool info
  const poolAccount = await program.account.commodityPool.fetch(poolPda);
  console.log("📊 Pool Info:");
  console.log("  Authority:", poolAccount.authority.toBase58());
  console.log("  USDC Vault:", poolAccount.usdcVault.toBase58());
  console.log("  Oil Mint:", poolAccount.oilMint.toBase58());
  console.log("  Gold Mint:", poolAccount.goldMint.toBase58());
  console.log("  Silver Mint:", poolAccount.silverMint.toBase58());
  console.log("  Natural Gas Mint:", poolAccount.naturalGasMint.toBase58());
  console.log();
  console.log("🔗 Explorer:", `https://explorer.solana.com/address/${poolPda.toBase58()}?cluster=devnet`);
  console.log("🔗 TX:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    if (err.logs) {
      console.log("\n📋 Program Logs:");
      err.logs.forEach(log => console.log("  ", log));
    }
    process.exit(1);
  });
