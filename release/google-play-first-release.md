# Google Play first release — pending build and upload

Requested developer account ID: 6493262015496640694
App name: Nutrition + Fitness
Package: com.glitchfy.nutritionfitness
Version name: 1.0.0
Version code: 1

Local app config sets Android versionCode to 1. The android-first-release EAS profile disables automatic incrementing and produces an AAB.

IMPORTANT: EAS uses remote app version management in this project. Before building, check/set its Android version code to 1 using EAS build:version:set for the android-first-release profile. The local versionCode alone does not override the remote value. Verify the resulting AAB manifest before uploading. If version code 1 has already been uploaded for this package, stop and resolve that conflict rather than silently changing it.

No AAB was found in the inspected project. No Google Play app record or release was created by this attempt. Build/signing and account actions are currently blocked by automatic approval review reporting that the workspace is out of credits.

After access is restored: verify the developer account, create/select the matching app record, confirm signing, build the AAB, validate its package/version/signature, and upload to an internal-testing draft. Public production rollout is not part of this first test-build preparation.
