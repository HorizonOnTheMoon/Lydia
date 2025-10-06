import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { LydiaCommoditySwap } from "../target/types/lydia_commodity_swap";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { assert } from "chai";

describe("lydia_commodity_swap", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LydiaCommoditySwap as Program<LydiaCommoditySwap>;

  // Hardcoded mint addresses from constants.rs
  const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
  const OIL_MINT = new PublicKey("AigaX4V7Wx7SPDC9Wc3zTkrCkWF1nQGEa8G2fUmLtGoH");
  const GOLD_MINT = new PublicKey("DbMEk1Fyb7KE34foshKbbB8D9BLfy3jEFFR4WUkdST4R");
  const SILVER_MINT = new PublicKey("Ay5iazmqsYhGZMvgVkELBKUQSqnbs7LxtjpHet29nCA3");
  const NATURAL_GAS_MINT = new PublicKey("BZognty8N6LiLKCrEGLP3hbqef8LFrYfK3SbNSZgqGQe");

  // Pyth Hermes API endpoint (for devnet)
  const PYTH_HERMES_ENDPOINT = "https://hermes.pyth.network";

  // PDAs
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    program.programId
  );

  let userUsdcAccount: PublicKey;
  let usdcVault: PublicKey;

  before(async () => {
    console.log("🔧 Setting up test environment...");
    console.log("Program ID:", program.programId.toBase58());
    console.log("Pool PDA:", poolPda.toBase58());
    console.log("Wallet:", provider.wallet.publicKey.toBase58());

    // Create user's USDC account
    try {
      const userAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        provider.wallet.payer,
        USDC_MINT,
        provider.wallet.publicKey
      );
      userUsdcAccount = userAccount.address;
      console.log("✅ User USDC account:", userUsdcAccount.toBase58());
    } catch (e) {
      console.log("Note: USDC account creation may require devnet USDC faucet");
      throw e;
    }
  });

  it("Initializes the commodity pool", async () => {
    console.log("\n📦 Initializing commodity pool...");

    // Create USDC vault token account
    const vaultKeypair = Keypair.generate();
    usdcVault = vaultKeypair.publicKey;

    try {
      await createAccount(
        provider.connection,
        provider.wallet.payer,
        USDC_MINT,
        poolPda, // Pool is the owner
        vaultKeypair
      );
      console.log("✅ USDC Vault created:", usdcVault.toBase58());
    } catch (e) {
      console.error("Failed to create vault:", e);
      throw e;
    }

    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          pool: poolPda,
          authority: provider.wallet.publicKey,
          usdcVault: usdcVault,
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

      console.log("✅ Initialize transaction signature:", tx);

      // Fetch pool account
      const poolAccount = await program.account.commodityPool.fetch(poolPda);

      console.log("📊 Pool Info:");
      console.log("  Authority:", poolAccount.authority.toBase58());
      console.log("  USDC Vault:", poolAccount.usdcVault.toBase58());
      console.log("  Oil Mint:", poolAccount.oilMint.toBase58());
      console.log("  Gold Mint:", poolAccount.goldMint.toBase58());
      console.log("  Silver Mint:", poolAccount.silverMint.toBase58());
      console.log("  Natural Gas Mint:", poolAccount.naturalGasMint.toBase58());

      // Verify
      assert.ok(poolAccount.authority.equals(provider.wallet.publicKey));
      assert.ok(poolAccount.oilMint.equals(OIL_MINT));
      assert.ok(poolAccount.goldMint.equals(GOLD_MINT));
      assert.ok(poolAccount.silverMint.equals(SILVER_MINT));
      assert.ok(poolAccount.naturalGasMint.equals(NATURAL_GAS_MINT));

    } catch (error) {
      console.error("❌ Initialize failed:", error);
      throw error;
    }
  });

  it("Swaps USDC for Gold tokens (with mock Pyth)", async () => {
    console.log("\n💰 Testing Gold swap...");

    // Create user's Gold token account
    const userGoldAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      GOLD_MINT,
      provider.wallet.publicKey
    );

    const usdcAmount = new BN(100_000_000); // 100 USDC

    try {
      // For testing, we'll use SystemProgram as a mock price update
      // In production, you'd fetch actual Pyth price updates from Hermes API
      console.log("⚠️  Using mock price update (SystemProgram)");
      console.log("💡 To use real Pyth prices, fetch from Hermes API");

      const tx = await program.methods
        .swap(
          { gold: {} }, // CommodityType enum
          usdcAmount
        )
        .accounts({
          pool: poolPda,
          userUsdcAccount: userUsdcAccount,
          usdcVault: usdcVault,
          userCommodityAccount: userGoldAccount.address,
          commodityMint: GOLD_MINT,
          priceUpdate: SystemProgram.programId, // Mock - replace with actual Pyth price update account
          user: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          clock: SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();

      console.log("✅ Swap transaction signature:", tx);

      const goldBalance = (
        await getAccount(provider.connection, userGoldAccount.address)
      ).amount;

      console.log("📊 Results:");
      console.log("  Gold received:", Number(goldBalance) / 1e6, "tokens");

      assert.ok(Number(goldBalance) > 0, "Should receive Gold tokens");

    } catch (error) {
      console.error("❌ Swap failed:", error);
      if (error.logs) {
        console.log("Transaction logs:", error.logs);
      }
      throw error;
    }
  });

  it("Displays final portfolio", async () => {
    console.log("\n📊 Final Portfolio:");
    console.log("  Program ID:", program.programId.toBase58());
    console.log("  Pool PDA:", poolPda.toBase58());
    console.log("\n🔗 Devnet Links:");
    console.log("  Explorer:", `https://explorer.solana.com/address/${program.programId.toBase58()}?cluster=devnet`);
    console.log("  Pool:", `https://explorer.solana.com/address/${poolPda.toBase58()}?cluster=devnet`);
  });
});
