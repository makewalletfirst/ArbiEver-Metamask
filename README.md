# EtherEver-Metamask8
rpc->dns, explorer->dns  <br>
<br>



all clear rest list but not auto select <br>

app/components/hooks/useNetworksByNamespace/useNetworksByNamespace.ts  <br>
206~209찌르기 <br>
app/components/hooks/useNetworksToUse/useNetworksToUse.ts  <br>
260~288찌르기 <br>

app/components/hooks/useNetworksToUse/useNetworksToUse.ts <br>
비트 솔 트론 어카운트 false 떄림 <br>




인기 1순위 <br>
티커 알피시 대체 <br>
블록브라우저 체인아이디 <br>
<br>
이더에버 명칭바꿔야함 <br>
암호 사이닝 키 파일들 재생성 <br>
기본 이그잼플 cp 후 build.gradle 이름 맞추기 <br>

<br>
원빌드 후 <br>
node_modules/@metamask/controller-utils/dist/types.cjs <br>
node_modules/@metamask/controller-utils/dist/types.mjs <br>
의 체인id, 티커, 블록주소를 수정하면 맞춤형탭에서 인기탭으로 넘어오면서 아이콘까지 박힘 <br>
인데 또해보니까 맞춤형으로 빠지고 체인명, 블록탐색기만 바뀌고 나머진 안되네<br>
<br>
<br>
<br>


vim app/components/UI/NetworkManager/index.tsx  <br>
수정할 줄: 142번 줄, 276번 줄 (대략적인 위치)

내용: chainId: '0x1' 이라고 된 부분을 찾아 chainId: '0xe2c3' 로 변경

vim app/components/Views/NetworkSelector/NetworkSelector.tsx <br>
수정할 줄: 214번 줄, 293번 줄

내용: chainId: '0x1' -> chainId: '0xe2c3'

vim app/core/Engine/controllers/transaction-controller/data-helpers.ts <br>
수정할 줄: 26번 줄

내용: chainId: '0x1' -> chainId: '0xe2c3'

<br>
성공
<br>

