import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { LydiaCommoditySwap } from "../target/types/lydia_commodity_swap";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("lydia_commodity_swap", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.LydiaCommoditySwap as Program<LydiaCommoditySwap>;

  // PDAs
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    program.programId
  );

  // Keypairs
  let usdcMint: PublicKey;
  let userUsdcAccount: PublicKey;
  let oilMint: Keypair;
  let goldMint: Keypair;
  let silverMint: Keypair;
  let naturalGasMint: Keypair;
  let usdcVault: PublicKey;

  before(async () => {
    console.log("🔧 Setting up test environment...");

    // Create USDC mint (mock devnet USDC)
    usdcMint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      6 // USDC has 6 decimals
    );
    console.log("✅ USDC Mint created:", usdcMint.toBase58());

    // Create user's USDC account
    const userAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      provider.wallet.publicKey
    );
    userUsdcAccount = userAccount.address;

    // Mint 1000 USDC to user
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      usdcMint,
      userUsdcAccount,
      provider.wallet.publicKey,
      1000_000_000 // 1000 USDC
    );
    console.log("✅ User USDC balance: 1000 USDC");

    // Generate keypairs for commodity mints
    oilMint = Keypair.generate();
    goldMint = Keypair.generate();
    silverMint = Keypair.generate();
    naturalGasMint = Keypair.generate();
  });

  it("Initializes the commodity pool", async () => {
    console.log("\n📦 Initializing commodity pool...");

    // Derive USDC vault PDA
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), poolPda.toBuffer()],
      program.programId
    );
    usdcVault = vaultPda;

    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          pool: poolPda,
          authority: provider.wallet.publicKey,
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

      console.log("✅ Initialize transaction signature:", tx);

      // Fetch pool account
      const poolAccount = await program.account.commodityPool.fetch(poolPda);

      console.log("📊 Pool Info:");
      console.log("  Authority:", poolAccount.authority.toBase58());
      console.log("  Oil Mint:", poolAccount.oilMint.toBase58());
      console.log("  Gold Mint:", poolAccount.goldMint.toBase58());
      console.log("  Silver Mint:", poolAccount.silverMint.toBase58());
      console.log("  Natural Gas Mint:", poolAccount.naturalGasMint.toBase58());

      // Verify
      assert.ok(poolAccount.authority.equals(provider.wallet.publicKey));
      assert.ok(poolAccount.oilMint.equals(oilMint.publicKey));
      assert.ok(poolAccount.goldMint.equals(goldMint.publicKey));
      assert.ok(poolAccount.silverMint.equals(silverMint.publicKey));
      assert.ok(poolAccount.naturalGasMint.equals(naturalGasMint.publicKey));

    } catch (error) {
      console.error("❌ Initialize failed:", error);
      throw error;
    }
  });

  it("Swaps USDC for Gold tokens", async () => {
    console.log("\n💰 Swapping 100 USDC for Gold...");

    // Create user's Gold token account
    const userGoldAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      goldMint.publicKey,
      provider.wallet.publicKey
    );

    const usdcAmount = new BN(100_000_000); // 100 USDC

    // Get initial balances
    const initialUsdcBalance = (
      await provider.connection.getTokenAccountBalance(userUsdcAccount)
    ).value.amount;

    try {
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
          commodityMint: goldMint.publicKey,
          priceFeed: SystemProgram.programId, // Mock for now
          user: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("✅ Swap transaction signature:", tx);

      // Check balances
      const finalUsdcBalance = (
        await provider.connection.getTokenAccountBalance(userUsdcAccount)
      ).value.amount;

      const goldBalance = (
        await provider.connection.getTokenAccountBalance(userGoldAccount.address)
      ).value.amount;

      console.log("📊 Results:");
      console.log("  USDC spent:", (parseInt(initialUsdcBalance) - parseInt(finalUsdcBalance)) / 1e6, "USDC");
      console.log("  Gold received:", parseInt(goldBalance) / 1e6, "tokens");

      // Verify USDC was deducted
      assert.equal(
        parseInt(initialUsdcBalance) - parseInt(finalUsdcBalance),
        usdcAmount.toNumber(),
        "USDC should be deducted"
      );

      // Verify Gold was received (at $1850/oz, 100 USDC should get ~0.054 Gold)
      assert.ok(parseInt(goldBalance) > 0, "Should receive Gold tokens");

    } catch (error) {
      console.error("❌ Swap failed:", error);
      throw error;
    }
  });

  it("Swaps USDC for Oil tokens", async () => {
    console.log("\n🛢️  Swapping 75 USDC for Oil...");

    // Create user's Oil token account
    const userOilAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      provider.wallet.payer,
      oilMint.publicKey,
      provider.wallet.publicKey
    );

    const usdcAmount = new BN(75_000_000); // 75 USDC

    try {
      const tx = await program.methods
        .swap(
          { oil: {} },
          usdcAmount
        )
        .accounts({
          pool: poolPda,
          userUsdcAccount: userUsdcAccount,
          usdcVault: usdcVault,
          userCommodityAccount: userOilAccount.address,
          commodityMint: oilMint.publicKey,
          priceFeed: SystemProgram.programId,
          user: provider.wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      console.log("✅ Swap transaction signature:", tx);

      const oilBalance = (
        await provider.connection.getTokenAccountBalance(userOilAccount.address)
      ).value.amount;

      console.log("📊 Results:");
      console.log("  Oil received:", parseInt(oilBalance) / 1e6, "tokens");
      console.log("  (At $75/barrel, 75 USDC = 1 Oil token)");

      // At $75/barrel, 75 USDC should get 1 Oil token
      assert.ok(parseInt(oilBalance) > 0, "Should receive Oil tokens");

    } catch (error) {
      console.error("❌ Swap failed:", error);
      throw error;
    }
  });

  it("Displays final portfolio", async () => {
    console.log("\n📊 Final Portfolio:");

    const usdcBalance = (
      await provider.connection.getTokenAccountBalance(userUsdcAccount)
    ).value.amount;

    console.log("  USDC remaining:", parseInt(usdcBalance) / 1e6, "USDC");
    console.log("  Program ID:", program.programId.toBase58());
    console.log("  Pool PDA:", poolPda.toBase58());
  });
});
