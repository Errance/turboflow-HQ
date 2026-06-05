
### SIG Credential
```
**SIT 已下发凭据**（可整段转发 SIG 做联调）：

字段值vendor_codeSIGapi_key（WS token）b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1secret_key（UAT/PROD HMAC 用；SIT 暂不要求）f46dc12ae45c4ec42e96f406eb4186187f638d4fd82cc2c925ed0c9d58920c88赔率推送 WSwss://surfv2-sit-api.nfexinsider.com/api/v1/vendor/feed?token=b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1自检订阅 WS（可选）wss://surfv2-sit-api.nfexinsider.com/api/v1/vendor/best_quote?token=b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1
```

SIT
- wss://surfv2-sit-api.nfexinsider.com/api/v1/vendor/feed?token=b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1

UAT
- [wss://private.turboflow-test.xyz/api/v1/vendor/feed?token=b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1](wss://private.turboflow-test.xyz/api/v1/vendor/feed?token=b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1)
- wss://surfv2-uat-api.nfexinsider.com/api/v1/vendor/feed?token=b9b87dfbc831a222448484c3eec53f51e7a30b2384db5cd28375adf60fb100a1


Docs
https://tf-team-vbfwtqkg.atlassian.net/wiki/external/NmMwMTExZTUxM2VmNGU2N2FkY2IyN2YwNmM1NzAyYmI