const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");

async function main() {
  console.log("🚀 Starting Lydia Commodity Swap Test\n");

  // Setup
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = anchor.AnchorProvider.env().wallet;
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load IDL
  const idl = require("../target/idl/lydia_commodity_swap.json");
  const programId = new PublicKey("HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8");
  const program = new anchor.Program(idl, programId, provider);

  console.log("📋 Program ID:", programId.toBase58());
  console.log("👛 Wallet:", wallet.publicKey.toBase58());

  // Find pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId
  );
  console.log("🏦 Pool PDA:", poolPda.toBase58());

  // Create mock USDC
  console.log("\n💵 Creating mock USDC...");
  const payerKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(require("fs").readFileSync(process.env.ANCHOR_WALLET, "utf-8"))));

  const usdcMint = await createMint(
    connection,
    payerKeypair,
    wallet.publicKey,
    null,
    6
  );
  console.log("✅ USDC Mint:", usdcMint.toBase58());

  // Create user USDC account and mint tokens
  const userUsdcAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    usdcMint,
    wallet.publicKey
  );

  await mintTo(
    connection,
    payerKeypair,
    usdcMint,
    userUsdcAccount.address,
    wallet.publicKey,
    1000_000_000
  );
  console.log("✅ Minted 1000 USDC to user");

  // Generate commodity mints
  const oilMint = Keypair.generate();
  const goldMint = Keypair.generate();
  const silverMint = Keypair.generate();
  const naturalGasMint = Keypair.generate();

  // Derive vault
  const [usdcVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), poolPda.toBuffer()],
    programId
  );

  // TEST 1: Initialize
  console.log("\n📦 TEST 1: Initializing Pool...");
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        pool: poolPda,
        authority: wallet.publicKey,
        usdcVault: usdcVault,
        usdcMint: usdcMint,
        oilMint: oilMint.publicKey,
        goldMint: goldMint.publicKey,
        silverMint: silverMint.publicKey,
        naturalGasMint: naturalGasMint.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([oilMint, goldMint, silverMint, naturalGasMint])
      .rpc();

    console.log("✅ Initialize TX:", tx);

    const poolAccount = await program.account.commodityPool.fetch(poolPda);
    console.log("📊 Pool initialized:");
    console.log("   Oil:", poolAccount.oilMint.toBase58());
    console.log("   Gold:", poolAccount.goldMint.toBase58());
  } catch (error) {
    console.error("❌ Initialize failed:", error.message);
    throw error;
  }

  // TEST 2: Swap for Gold
  console.log("\n💰 TEST 2: Swapping 100 USDC for Gold...");
  try {
    const userGoldAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      goldMint.publicKey,
      wallet.publicKey
    );

    const tx = await program.methods
      .swap({ gold: {} }, new anchor.BN(100_000_000))
      .accounts({
        pool: poolPda,
        userUsdcAccount: userUsdcAccount.address,
        usdcVault: usdcVault,
        userCommodityAccount: userGoldAccount.address,
        commodityMint: goldMint.publicKey,
        priceFeed: SystemProgram.programId,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Swap TX:", tx);

    const goldBalance = await connection.getTokenAccountBalance(userGoldAccount.address);
    console.log("📊 Gold received:", parseFloat(goldBalance.value.amount) / 1e6, "tokens");
    console.log("   (At $1850/oz, 100 USDC ≈ 0.054 Gold tokens)");
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    throw error;
  }

  // Final balance
  console.log("\n📊 Final Portfolio:");
  const finalUsdcBalance = await connection.getTokenAccountBalance(userUsdcAccount.address);
  console.log("   USDC remaining:", parseFloat(finalUsdcBalance.value.amount) / 1e6);

  console.log("\n✅ All tests passed! 🎉\n");
  console.log("🔗 View on Explorer:");
  console.log(`   https://explorer.solana.com/address/${programId.toBase58()}?cluster=devnet`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
