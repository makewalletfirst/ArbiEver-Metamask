# ArbiMask (ArbiEver-Metamask)

[![ArbiMask CI](https://github.com/makewalletfirst/ArbiEver-Metamask/actions/workflows/ci.yml/badge.svg)](https://github.com/makewalletfirst/ArbiEver-Metamask/actions/workflows/ci.yml)

> **ArbiMask** is a highly customized MetaMask Mobile fork, pre-configured as the dedicated mobile wallet client for **ArbiEver**—an Arbitrum Nitro AnyTrust L2 network built on top of the **EtherEver L1** parent chain.  
> It is tailored to offer smooth mobile asset management and optimal compatibility with the custom EVM properties of the ArbiEver ecosystem.

---

## 🌌 ArbiEver L2 & ArbiMask Ecosystem

### 1. ArbiEver L2 Network Metadata
- **L1 Parent Chain**: EtherEver (A custom PoW Ethereum fork split at block 1,919,999)
  - **L1 Chain ID**: `58051` (0xe2c3)
  - **L1 RPC**: `https://rpc-ether.ever-chain.xyz`
  - **L1 EVM Standard**: Pre-London Gas Model (EIP-1559 and PUSH0 opcodes are not supported)
- **L2 Chain (ArbiEver)**: Arbitrum Nitro AnyTrust Protocol
  - **L2 Chain ID**: `580511` (0x8d9c7)
  - **L2 Mode**: AnyTrust (Utilizes a 1-member Data Availability Committee - DAC)
  - **Infrastructure Stack**: Powered by a Sequencer (Nitro node), Batch Poster, Validator (Staker), and DAC Server (`daserver`).

### 2. Role of ArbiMask
ArbiMask serves as the dedicated portal to the ArbiEver network, integrating network configurations, chain mappings, and tailored EVM capabilities directly into the core mobile codebase. It delivers high-throughput and cost-efficient transaction processing capabilities for the end user.

---

## 🛠️ ArbiMask APK Build Guide (Server Protection Strategies)

Building this large-scale project involves heavy C++ and Android NDK compilation (clang compiler). Running a standard release build (`./gradlew assembleProdRelease`) in restricted resource environments without optimization will lead to **extreme Out of Memory (OOM) situations, severe disk thrashing, and ultimate kernel lockups (load average exceeding 80)**.

To successfully build the production APK without compromising server host stability, apply the following **five resource-control strategies**.

### ⚠️ Past Failure Root Causes
1. **Parallel Compilation Blast**: Ninja spawns `nproc+2` = 8 concurrent clang compiler processes, demanding 8~16GB RAM for native tasks and causing immediate OOM.
2. **Quad-ABI Overheads**: Building all 4 target ABIs (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`) quadruples native compile tasks.
3. **Absence of Buffer**: Lack of persistent swap space on host reboot leaves zero headroom for memory surges, driving the system into an IO-wait state.

---

### 💡 Core Server Protection Principles

| Strategy | Technical Mechanism & Impact |
| :--- | :--- |
| **Ninja Wrapper (`-j 2`)** | Restricts concurrent clang processes from 8 down to **2**, putting a hard ceiling on native RAM spikes. |
| **Single ABI Targeting** | Targets only `arm64-v8a` CPU architecture, slashing native compilation work to **1/4** (adequate for modern devices). |
| **Swap Buffer Setup** | Ensures active swap allocation (8GB) and adjusts `vm.swappiness=10` to prioritize RAM retention and control disk thrashing. |
| **cgroup Memory Limiting** | Uses `systemd-run` to impose an absolute **9GB RAM cap** on the build task, isolating failures and protecting the host OS. |
| **CPU Pinning & Low Priority** | Binds build tasks to **3 out of 6 cores** using `taskset` and schedules lowest priorities via `nice` / `ionice` to prevent service disruptions on core nodes (Sequencer, DAC, etc.). |

---

### 📝 Step-by-Step Build Instructions

Execution Directory: `/root/ArbiEver-Metamask/android`  
*Recommendation: Suspend other high-load containers (e.g., Blockscout) temporarily during build to maximize available resources.*

#### 1) Set Up the Ninja Wrapper (First-Time Only)
```bash
NINJA=/root/android-sdk/cmake/3.22.1/bin/ninja
# Backup the original ninja binary
mv "$NINJA" "$NINJA.real"
# Create a wrapper shell script to enforce maximum 2 parallel jobs
printf '#!/bin/sh\nexec "$(dirname "$0")/ninja.real" "$@" -j 2\n' > "$NINJA"
chmod +x "$NINJA"
```

#### 2) Enforce Single ABI targeting
```bash
sed -i 's/^reactNativeArchitectures=.*/reactNativeArchitectures=arm64-v8a/' \
  /root/ArbiEver-Metamask/android/gradle.properties
```

#### 3) Initialize Swap Space & Adjust Swappiness
```bash
# Enable pre-configured swap partitions
swapon /swapfile; swapon /swapfile2
# Suppress heavy virtual memory paging
sysctl -w vm.swappiness=10
```

#### 4) Execute Resource-Isolated Build Task
Inject your environment variables and spin up the build under cgroup limits:
```bash
cd /root/ArbiEver-Metamask/android

systemd-run --scope --unit=arbimask-build \
  -p MemoryMax=9G -p MemorySwapMax=4G -p CPUQuota=300% \
  bash -c '
    set -a; source ../.js.env; source ../.android.env; set +a
    export ANDROID_HOME=/root/android-sdk ANDROID_SDK_ROOT=/root/android-sdk
    export SENTRY_DISABLE_AUTO_UPLOAD=true
    taskset -c 0,1,2 nice -n 15 ionice -c3 ./gradlew assembleProdRelease \
      --max-workers=1 -Dorg.gradle.parallel=false -Dorg.gradle.workers.max=1 --no-daemon
  '
```

#### 5) Real-Time Resource Monitoring
Open a separate terminal window and monitor server vitals to preemptively track the build process:
```bash
watch -n5 'uptime; free -m | grep -E "Mem|Swap"; echo clang_count=$(pgrep -c clang)'
```
*If system load average goes beyond 6, or free memory falls under 200MB, execute the following command immediately to safely abort the build:*  
`systemctl stop arbimask-build.scope`

#### 6) Validate Build Output & Sign Integrity
Once compilation is complete, check packaging attributes and verify signing compliance:
- **Production APK Path**: `android/app/build/outputs/apk/prod/release/app-prod-release.apk`
```bash
# Extract package identifiers and labels
AAPT=$(ls /root/android-sdk/build-tools/*/aapt2|sort -V|tail -1)
$AAPT dump badging android/app/build/outputs/apk/prod/release/app-prod-release.apk | grep -E "package:|application-label:"
# Expected Output: package: io.arbiever.wallet / application-label:'ArbiEver'

# Verify cryptographic signature for installer validity
SIGNER=$(ls /root/android-sdk/build-tools/*/apksigner|sort -V|tail -1)
$SIGNER verify android/app/build/outputs/apk/prod/release/app-prod-release.apk
```
