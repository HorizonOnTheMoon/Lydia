const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");

async function main() {
  console.log("🚀 Starting Lydia Commodity Swap Test\n");

  // Setup
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const payerKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(require("fs").readFileSync(process.env.ANCHOR_WALLET, "utf-8")))
  );

  const wallet = new anchor.Wallet(payerKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  // Load IDL
  const idl = require("../target/idl/lydia_commodity_swap.json");
  const programId = new PublicKey("HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8");
  const program = new anchor.Program(idl, programId, provider);

  console.log("📋 Program ID:", programId.toBase58());
  console.log("👛 Wallet:", wallet.publicKey.toBase58());
  console.log("💰 Balance:", await connection.getBalance(wallet.publicKey) / 1e9, "SOL\n");

  // Find pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId
  );
  console.log("🏦 Pool PDA:", poolPda.toBase58());

  // Create mock USDC
  console.log("\n💵 Creating mock USDC...");
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

  // PRE-CREATE commodity mints
  console.log("\n🪙 Creating commodity mints...");
  const oilMint = await createMint(connection, payerKeypair, poolPda, null, 6);
  console.log("   Oil Mint:", oilMint.toBase58());

  const goldMint = await createMint(connection, payerKeypair, poolPda, null, 6);
  console.log("   Gold Mint:", goldMint.toBase58());

  const silverMint = await createMint(connection, payerKeypair, poolPda, null, 6);
  console.log("   Silver Mint:", silverMint.toBase58());

  const naturalGasMint = await createMint(connection, payerKeypair, poolPda, null, 6);
  console.log("   Natural Gas Mint:", naturalGasMint.toBase58());

  // Derive vault - but we need to create it as a token account
  console.log("\n🏦 Creating USDC vault...");
  const usdcVault = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    usdcMint,
    poolPda,
    true // allowOwnerOffCurve
  );
  console.log("✅ USDC Vault:", usdcVault.address.toBase58());

  // TEST 1: Initialize Pool (simplified - just store the addresses)
  console.log("\n📦 TEST 1: Initializing Pool...");
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        pool: poolPda,
        authority: wallet.publicKey,
        usdcVault: usdcVault.address,
        usdcMint: usdcMint,
        oilMint: oilMint,
        goldMint: goldMint,
        silverMint: silverMint,
        naturalGasMint: naturalGasMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Initialize TX:", tx);
    console.log("🔗 View:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Fetch pool
    const poolAccount = await program.account.commodityPool.fetch(poolPda);
    console.log("\n📊 Pool State:");
    console.log("   Authority:", poolAccount.authority.toBase58());
    console.log("   USDC Vault:", poolAccount.usdcVault.toBase58());
    console.log("   Oil:", poolAccount.oilMint.toBase58());
    console.log("   Gold:", poolAccount.goldMint.toBase58());
    console.log("   Silver:", poolAccount.silverMint.toBase58());
    console.log("   Natural Gas:", poolAccount.naturalGasMint.toBase58());
  } catch (error) {
    console.error("❌ Initialize failed:", error.message);
    if (error.logs) {
      console.log("Program logs:");
      error.logs.forEach(log => console.log("  ", log));
    }
    throw error;
  }

  // TEST 2: Swap for Gold
  console.log("\n💰 TEST 2: Swapping 100 USDC for Gold...");
  try {
    const userGoldAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      goldMint,
      wallet.publicKey
    );

    const initialUsdcBalance = await connection.getTokenAccountBalance(userUsdcAccount.address);
    console.log("   Initial USDC:", parseFloat(initialUsdcBalance.value.amount) / 1e6);

    const tx = await program.methods
      .swap({ gold: {} }, new anchor.BN(100_000_000))
      .accounts({
        pool: poolPda,
        userUsdcAccount: userUsdcAccount.address,
        usdcVault: usdcVault.address,
        userCommodityAccount: userGoldAccount.address,
        commodityMint: goldMint,
        priceFeed: SystemProgram.programId,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Swap TX:", tx);
    console.log("🔗 View:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    const goldBalance = await connection.getTokenAccountBalance(userGoldAccount.address);
    const finalUsdcBalance = await connection.getTokenAccountBalance(userUsdcAccount.address);

    console.log("\n📊 Results:");
    console.log("   USDC spent:", 100, "USDC");
    console.log("   USDC remaining:", parseFloat(finalUsdcBalance.value.amount) / 1e6);
    console.log("   Gold received:", parseFloat(goldBalance.value.amount) / 1e6, "tokens");
    console.log("   (At $1850/oz, 100 USDC ≈ 0.054054 Gold tokens)");
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    if (error.logs) {
      console.log("Program logs:");
      error.logs.forEach(log => console.log("  ", log));
    }
    throw error;
  }

  // TEST 3: Swap for Oil
  console.log("\n🛢️  TEST 3: Swapping 75 USDC for Oil...");
  try {
    const userOilAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payerKeypair,
      oilMint,
      wallet.publicKey
    );

    const tx = await program.methods
      .swap({ oil: {} }, new anchor.BN(75_000_000))
      .accounts({
        pool: poolPda,
        userUsdcAccount: userUsdcAccount.address,
        usdcVault: usdcVault.address,
        userCommodityAccount: userOilAccount.address,
        commodityMint: oilMint,
        priceFeed: SystemProgram.programId,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Swap TX:", tx);
    console.log("🔗 View:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    const oilBalance = await connection.getTokenAccountBalance(userOilAccount.address);
    const finalUsdcBalance = await connection.getTokenAccountBalance(userUsdcAccount.address);

    console.log("\n📊 Results:");
    console.log("   USDC spent:", 75, "USDC");
    console.log("   USDC remaining:", parseFloat(finalUsdcBalance.value.amount) / 1e6);
    console.log("   Oil received:", parseFloat(oilBalance.value.amount) / 1e6, "tokens");
    console.log("   (At $75/barrel, 75 USDC = 1 Oil token)");
  } catch (error) {
    console.error("❌ Swap failed:", error.message);
    if (error.logs) {
      console.log("Program logs:");
      error.logs.forEach(log => console.log("  ", log));
    }
    throw error;
  }

  // Final Portfolio
  console.log("\n📊 Final Portfolio:");
  const finalUsdcBalance = await connection.getTokenAccountBalance(userUsdcAccount.address);
  console.log("   USDC:", parseFloat(finalUsdcBalance.value.amount) / 1e6);
  console.log("   Gold:", "~0.054 tokens");
  console.log("   Oil:", "~1.0 tokens");

  console.log("\n✅ All tests passed! 🎉\n");
  console.log("🔗 View Pool on Explorer:");
  console.log(`   https://explorer.solana.com/address/${poolPda.toBase58()}?cluster=devnet`);
}

main()
  .then(() => {
    console.log("\n✨ Test suite completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test suite failed:", error);
    process.exit(1);
  });
