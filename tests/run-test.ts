import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import idl from "../target/idl/lydia_commodity_swap.json";

async function main() {
  console.log("🚀 Starting Lydia Commodity Swap Test\n");

  // Setup provider
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = anchor.AnchorProvider.env().wallet;
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Load program
  const programId = new PublicKey("HsBV6Uhk4NV65zTK93ofoT8zYei91bezMdCFXgAPoKE8");
  const program = new Program(idl as any, programId, provider);

  console.log("📋 Program ID:", programId.toBase58());
  console.log("👛 Wallet:", wallet.publicKey.toBase58());

  // PDAs
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    programId
  );
  console.log("🏦 Pool PDA:", poolPda.toBase58());

  // Create USDC mint (mock)
  console.log("\n💵 Creating mock USDC...");
  const usdcMint = await createMint(
    connection,
    wallet.payer,
    wallet.publicKey,
    null,
    6
  );
  console.log("✅ USDC Mint:", usdcMint.toBase58());

  // Create user USDC account
  const userUsdcAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet.payer,
    usdcMint,
    wallet.publicKey
  );

  // Mint 1000 USDC to user
  await mintTo(
    connection,
    wallet.payer,
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

  // Derive USDC vault
  const [usdcVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), poolPda.toBuffer()],
    programId
  );

  // TEST 1: Initialize Pool
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

    // Fetch pool
    const poolAccount = await program.account.commodityPool.fetch(poolPda);
    console.log("📊 Pool initialized:");
    console.log("   Oil:", poolAccount.oilMint.toBase58());
    console.log("   Gold:", poolAccount.goldMint.toBase58());
    console.log("   Silver:", poolAccount.silverMint.toBase58());
    console.log("   Natural Gas:", poolAccount.naturalGasMint.toBase58());
  } catch (error) {
    console.error("❌ Initialize failed:", error);
    throw error;
  }

  // TEST 2: Swap for Gold
  console.log("\n💰 TEST 2: Swapping 100 USDC for Gold...");
  try {
    const userGoldAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      goldMint.publicKey,
      wallet.publicKey
    );

    const tx = await program.methods
      .swap({ gold: {} }, new BN(100_000_000))
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

    const goldBalance = await connection.getTokenAccountBalance(
      userGoldAccount.address
    );
    console.log("📊 Gold received:", parseFloat(goldBalance.value.amount) / 1e6, "tokens");
  } catch (error) {
    console.error("❌ Swap failed:", error);
    throw error;
  }

  // TEST 3: Swap for Oil
  console.log("\n🛢️  TEST 3: Swapping 75 USDC for Oil...");
  try {
    const userOilAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      oilMint.publicKey,
      wallet.publicKey
    );

    const tx = await program.methods
      .swap({ oil: {} }, new BN(75_000_000))
      .accounts({
        pool: poolPda,
        userUsdcAccount: userUsdcAccount.address,
        usdcVault: usdcVault,
        userCommodityAccount: userOilAccount.address,
        commodityMint: oilMint.publicKey,
        priceFeed: SystemProgram.programId,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("✅ Swap TX:", tx);

    const oilBalance = await connection.getTokenAccountBalance(
      userOilAccount.address
    );
    console.log("📊 Oil received:", parseFloat(oilBalance.value.amount) / 1e6, "tokens");
  } catch (error) {
    console.error("❌ Swap failed:", error);
    throw error;
  }

  // Final balances
  console.log("\n📊 Final Portfolio:");
  const finalUsdcBalance = await connection.getTokenAccountBalance(
    userUsdcAccount.address
  );
  console.log("   USDC remaining:", parseFloat(finalUsdcBalance.value.amount) / 1e6);

  console.log("\n✅ All tests passed! 🎉");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
