# 新增城市资料 e 组：沿海与江南城市

数据整理日期：2026-10-27；本轮来源复查日期：2026-10-31。数据文件：`prototype/data/hot-cities-e.json`。本组10城、每城10个独立目的地，共100景，110条城市/景点记录保留原 `verifiedAt: 2026-10-27`，本轮未批量改写日期。

## 字段、来源与时效边界

- 城市数据含名称、省份、区域坐标、主题、分层、视觉类别、简介、亮点、三项美食及逐项说明、季节、气候、抵达交通、本地交通、建议天数、三日路线、提示与来源；景点含唯一ID、名称、坐标、主题、视觉类别、介绍、亮点、接驳、建议停留、提示和来源。下表直接索引现有JSON，未复制官网正文。
- Wikivoyage引用全部保留 `CC BY-SA 4.0` 与 `Wikivoyage contributors`。地方政府、主管部门、景区和博物馆用于地点、文化及接驳背景；部分来源是官方媒体转发，引用机构和原文标签不等于所有网页都为行政机关官网。
- `verifiedAt`表示资料整理批次；本次已对10城主引逐一尝试打开，区分正文可读、搜索索引可读与抓取超时，没有将超时当作验证成功。没有逐一重新浏览94个URL，也不据此承诺100景在复查当日全部开放。
- 坐标用于区域定位；大型景区、古村和海岛按当天开放的正式入口导航。建议停留不代替公路、轮渡和山地接驳时间，三日路线为分区选择，不承诺三天走遍10景。
- 不采用旧票价、班次、公交时刻和旧活动优惠。海岛渡船、海滨活动、潮汐、山路、展厅预约与开闭园情况，以出行当日运营方公告为准。

## 重点变化和风险来源

- 嘉兴南湖机场已于2025-12-26投运，不能沿用“嘉兴无民航机场”。JSON已有运营入口说明；[浙江省政府英文门户通航报道](https://www.ezhejiang.gov.cn/jiaxing/2025-12/26/c_1150937.htm)明确投运日期，[民航局运输机场名录](https://app.caac.gov.cn/GYMH/MHGK/MYJC/index_1.html)列出嘉兴南湖机场。航线仍需查询当日航班。
- 济宁采用大安机场，不沿用旧曲阜机场。[民航局2023年全国民用运输机场生产统计公报](https://www.caac.gov.cn/XXGK/XXGK/TJSJ/202403/P020240320504230898437.pdf)明确曲阜机场迁至大安机场；[民航华东地区2024年机场吞吐量统计](https://www.caac.gov.cn/PHONE/GLJ_PHONE/HDGLJ/XXGK/HD_TJSJ/202503/P020250317348552400373.pdf)列有济宁/大安，亦列有威海/大水泊、日照/山字河，可交叉核对交通入口。
- 温州本组未收录百丈漈，保留朔门古港遗址公园。[文成文旅官方账号发布的2026-08-26闭园通知](https://tidenews.com.cn/tmh_news.html?id=6a8f0f676437e20001e40b07)列百丈漈及铜铃山等受台风影响暂停开放，恢复时间另行通知；[温州文旅官方账号2026-09-02通知](https://weibo.com/2/detail/5338730489187373)另记百丈漈因强降雨暂停开放。两者均为历史天气通告，不能推断2026-10-31仍停业，铜铃山也需查当日公告。
- [温州博物馆2026-04-15朔门古港专页](https://www.wzmuseum.cn/Art/Art_18/Art_18_12467.aspx)可核对遗址公园、原址展示和考古陈列馆；其与市府路温州博物馆主馆分别计数有实际馆址依据，公园内部展馆不再拆计。

## 城市与100景完整索引

### 威海（weihai / 山东）

刘公岛整体计一景，岛上纪念场馆不拆。成山头、赤山、那香海在荣成方向；乳山银滩另属乳山市，与威海城区和荣成分区安排，均为威海地级市辖域。

本轮主引检查：政府数字便民地图正文可读，可核对景区名称和区市地址。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| weihai-liugongdao | 刘公岛 | 约半天至1天 | 4 |
| weihai-chengshantou | 成山头 | 约半天 | 2、3 |
| weihai-huaxiacheng | 华夏城 | 约半天 | 2 |
| weihai-chishan | 赤山 | 约半天 | 2、3 |
| weihai-huancuilou | 环翠楼公园 | 约1—2小时 | 2 |
| weihai-naxianghai | 那香海 | 约2—4小时 | 2、3 |
| weihai-likoushan | 里口山 | 约半天 | 2、3 |
| weihai-xianguding | 仙姑顶 | 约3—4小时 | 2 |
| weihai-rushan-yintan | 乳山银滩 | 约半天至1天 | 2、3 |
| weihai-international-beach | 威海国际海水浴场 | 约2—3小时 | 2 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Weihai](https://en.wikivoyage.org/wiki/Weihai) — CC BY-SA 4.0，Wikivoyage contributors。
2. [威海市人民政府 · 数字便民地图景区名录](https://www.weihai.gov.cn/szdt/web/mapIndex/3?mapClassificationPid=21)
3. [威海新闻网 · 生态旅游打卡点](https://www.whnews.cn/news/node/2026-05/26/content_7387323.htm)
4. [刘公岛景区 · 官方网站](https://www.liugongdao.com.cn/)

### 日照（rizhao / 山东）

五莲山在五莲县，浮来山和莒国古城在莒县，均需县际接驳。万平口、灯塔广场、东夷小镇为不同目的地；森林公园不把内部沙滩另拆。赶海先查潮汐和开放边界。

本轮主引检查：rzta.com直接打开超时，搜索索引可读，内容包含较旧交通资料；不据其保证当前班次。补充资料以JSON内官方报刊、政府和景区专页为主；该旅游网不单独标作已确认政府官网。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| rizhao-wanpingkou | 万平口 | 约2—4小时 | 4 |
| rizhao-lighthouse | 灯塔广场 | 约1—2小时 | 3、2 |
| rizhao-seaside-forest | 日照海滨国家森林公园 | 约半天 | 5、2 |
| rizhao-dongyi | 东夷小镇 | 约2—3小时 | 6 |
| rizhao-city-museum | 日照市博物馆 | 约2小时 | 7 |
| rizhao-wulianshan | 五莲山 | 约半天至1天 | 8 |
| rizhao-longmengu | 龙门崮 | 约半天 | 9 |
| rizhao-fulaishan | 浮来山 | 约3—4小时 | 10、9 |
| rizhao-jugucheng | 莒国古城 | 约半天 | 10 |
| rizhao-liujiawan | 刘家湾赶海园 | 约2—4小时 | 9、2 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Rizhao](https://en.wikivoyage.org/wiki/Rizhao) — CC BY-SA 4.0，Wikivoyage contributors。
2. [日照旅游网 · 景区与地方美食](https://rzta.com/)
3. [中国旅游报 · 日照滨海旅游线路](https://www.ctnews.com.cn/paper/att/202005/18/38439f73-3bcf-4ab4-a634-d8d04c28abe8.pdf)
4. [山东省校外融合教育服务平台 · 万平口海滨风景区](https://www.sdschool.cn/jqinfo.aspx?ZYGID=6D8BE7B21060C487)
5. [湖南省林业局 · 山东日照海滨国家森林公园](https://lyj.hunan.gov.cn/tslm_71206/lykp/syjs/201512/t20151227_2617348.html)
6. [日照旅游资讯 · 东夷小镇简介](https://lxt.rzta.com/%2F/show.asp?id=5143)
7. [山东宣传网 · 日照市博物院数字化参观](https://www.sdxc.gov.cn/whql/whqlsy/202610/t20261023_18232395.htm)
8. [五莲山旅游景区 · 官方网站](https://www.wlslyjq.cn/)
9. [济宁市财政局 · 山东景区名录附件](https://jicz.jining.gov.cn/module/download/downfile.jsp?classid=0&filename=7543621123184140a39d151c5e9e045e.pdf&showname=%E6%B5%8E%E5%AE%81%E5%B8%82%E8%B4%A2%E6%94%BF%E5%B1%80%E5%87%8F%E7%A8%8E%E9%99%8D%E8%B4%B9%E4%B8%BB%E8%A6%81%E6%94%BF%E7%AD%96%E6%96%87%E4%BB%B6%E6%B1%87%E7%BC%96.pdf)
10. [日照日报 · 莒县夏日文旅](https://rbrk.rznews.cn/paper/s1/t1/rzrb/20260722/B02/t1_text01.html)

### 淄博（zibo / 山东）

张店、周村、临淄、淄川、博山和桓台分区组织；齐文化博物馆与陶瓷琉璃馆为不同馆址。原山与鲁山为不同森林公园，王渔洋故里按一个完整目的地计数。

本轮主引检查：商务局主目录直接打开超时，搜索索引能读到陶瓷琉璃馆、海岱楼、红叶柿岩等条目；2026A级名录直接打开也超时，不能声称本轮已阅读全文。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| zibo-ceramics-glass | 中国陶瓷琉璃馆 | 约2—3小时 | 2、3 |
| zibo-haidailou | 海岱楼钟书阁 | 约1—2小时 | 4 |
| zibo-zhoucun | 周村古商城 | 约半天 | 3、5 |
| zibo-qi-museum | 齐文化博物馆 | 约2—3小时 | 3、5 |
| zibo-pu-songling | 蒲松龄纪念馆 | 约1—2小时 | 6 |
| zibo-tanxishan | 潭溪山 | 约半天至1天 | 2、5 |
| zibo-yuanshan | 原山国家森林公园 | 约半天 | 2、5 |
| zibo-lushan | 鲁山国家森林公园 | 约半天至1天 | 3、2 |
| zibo-hongye-shiyan | 红叶柿岩 | 约半天 | 2、3 |
| zibo-wang-yuyang | 王渔洋故里 | 约2—3小时 | 3 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Zibo](https://en.wikivoyage.org/wiki/Zibo) — CC BY-SA 4.0，Wikivoyage contributors。
2. [淄博市商务局 · 景点介绍](https://boftec.zibo.gov.cn/cec/charm/list?cateid=10)
3. [淄博市文化和旅游局 · 2026年4月A级景区名录](https://wh.zibo.gov.cn/gongkai/channel_c_5f9fa491ab327f36e4c13060_n_1605682609.0203/doc_69ddd50b1aa498f7fce04d2c.html)
4. [淄博市商务局 · 海岱楼钟书阁](https://boftec.zibo.gov.cn/cec/charm/detail?charmid=1090)
5. [淄博市文化和旅游局 · 精品旅游线路](https://wh.zibo.gov.cn/art/2016/9/6/art_260_1606237.html)
6. [淄博市文化和旅游局 · 蒲松龄纪念馆](https://wh.zibo.gov.cn/art/2017/9/18/art_4110_670826.html)

### 济宁（jining / 山东）

曲阜三孔整体计一景，孔府/孔庙/孔林未拆；孟府孟庙整体计一景，孔子博物馆为单独馆址。曲阜、邹城、微山、梁山、汶上分别安排，不能把地级市辖域当成主城步行圈。

本轮主引检查：文旅局2023九大主题线路正文可读；2026机场运营报道可打开但正文截短，机场迁建另由民航局公报核实。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| jining-sankong | 曲阜三孔 | 约半天至1天 | 2 |
| jining-confucius-museum | 孔子博物馆 | 约2—3小时 | 2 |
| jining-nishan | 尼山圣境 | 约半天至1天 | 2 |
| jining-meng-mansion-temple | 孟府孟庙 | 约2—3小时 | 2 |
| jining-yishan | 峄山 | 约半天至1天 | 2 |
| jining-weishan-lake | 微山湖旅游区 | 建议1天；深游可住1晚 | 2 |
| jining-liangshan | 水泊梁山 | 约半天 | 2 |
| jining-baoxiang-temple | 宝相寺 | 约2—3小时 | 4、2 |
| jining-city-museum | 济宁市博物馆 | 约2—3小时 | 5 |
| jining-taibai-tower | 太白楼 | 约1—2小时 | 6 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Jining_(Shandong)](https://en.wikivoyage.org/wiki/Jining_(Shandong)) — CC BY-SA 4.0，Wikivoyage contributors。
2. [济宁市文化和旅游局 · 文化济宁九大主题线路](https://whlyj.jining.gov.cn/art/2023/10/16/art_32546_2708935.html)
3. [济宁市人民政府 · 济宁大安机场运营](https://www.jining.gov.cn/art/2026/5/9/art_182_2934924.html)
4. [济宁市文化和旅游局 · 太子灵踪塔](https://whlyj.jining.gov.cn/art/2025/6/8/art_70690_2706017.html)
5. [济宁市博物馆 · 官方网站与新馆地址](https://www.jiningmuseum.com/home.do)
6. [济宁市文化和旅游局 · 李白纪念馆与太白楼](https://whlyj.jining.gov.cn/art/2021/3/19/art_70214_2706230.html)

### 漳州（zhangzhou / 福建）

田螺坑与云水谣分别为南靖土楼独立片区，华安大地土楼群另属华安县，不把同一土楼内部楼层拆分。东山风动石与马銮湾为不同海岸目的地，东山县可走陆路跨海通道，不默认必须乘船。埭美在龙海，天福茶博物院在漳浦。

本轮主引检查：福建省自然资源厅2026古城活化更新专页正文可读，归属与保护背景可核对。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| zhangzhou-ancient-city | 漳州古城 | 约半天 | 2 |
| zhangzhou-yundongyan | 云洞岩 | 约2—3小时 | 4 |
| zhangzhou-nanshan-temple | 南山寺 | 约1—2小时 | 5 |
| zhangzhou-tianluokeng | 田螺坑土楼群 | 约半天 | 6、3 |
| zhangzhou-yunshuiyao | 云水谣 | 约半天至1天 | 6、3 |
| zhangzhou-huaan-dadi | 华安大地土楼群 | 约半天 | 7、6 |
| zhangzhou-dongshan-fengdongshi | 东山风动石景区 | 约2—3小时 | 8 |
| zhangzhou-maluan-bay | 东山马銮湾 | 约半天 | 9 |
| zhangzhou-daimei-village | 埭美古村 | 约2—3小时 | 10 |
| zhangzhou-tianfu-tea | 天福茶博物院 | 约2—3小时 | 11 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Zhangzhou](https://en.wikivoyage.org/wiki/Zhangzhou) — CC BY-SA 4.0，Wikivoyage contributors。
2. [福建省自然资源厅 · 漳州古城保护与利用](https://zrzyt.fujian.gov.cn/zwgk/xwdt/zrzyyw/202609/t20260909_7210976.htm)
3. [文化和旅游部 · 花样漳州人文世遗文化之旅](https://zhuanti.mct.gov.cn/xcszbwg2022/fujian/detail/2036.html)
4. [漳州党史方志 · 云洞岩](https://zz.fjdsfzw.org.cn/2017-06-07/content_90720.html)
5. [漳州党史方志 · 南山寺](https://zz.fjdsfzw.org.cn/2017-06-07/content_90723.html)
6. [UNESCO World Heritage Centre · Fujian Tulou](https://whc.unesco.org/en/list/1113/)
7. [福建省人民政府 · 华安大地土楼群](https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/sdjj/wvjj/202401/t20240116_6381236.htm)
8. [东山岛滨海旅游度假区 · 官方资讯](https://www.dongshandao.com/index.php?g=Home&m=Index)
9. [生态环境部环境规划院 · 东山岛公众亲海型美丽海湾](https://www.caep.org.cn/sy/zhghypg/dtxx/202512/W020251227490327986428.pdf)
10. [福建省人民政府 · 埭美古村旅游与保护](https://www.fujian.gov.cn/zwgk/ztzl/gjcjgxgg/xld/202407/t20240728_6490569.htm)
11. [福建省人民政府 · 天福茶文化保护展示点](https://www.fujian.gov.cn/zwgk/zfxxgk/szfwj/jgzz/xzgfxwj/202211/t20221115_6048739.htm)

### 莆田（putian / 福建）

湄洲岛连同祖庙等岛内内容整体计一景，经文甲码头轮渡。九鲤湖在仙游，九龙谷为另一个有独立入口的景区，不能沿山谷自行穿越串游。市博物馆与绶溪公园相邻但为独立场馆/公园，未把馆内展厅拆分。

本轮主引检查：福建省政府2023城市游线可读但页面标注“废止、失效”，仅作历史背景；2026兴化府专页可读，当前活动/船线不沿用2023稿。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| putian-meizhou-island | 湄洲岛 | 约1天；慢游可住1晚 | 4 |
| putian-guanghua-temple | 广化寺 | 约1—2小时 | 5 |
| putian-south-shaolin | 莆田南少林寺 | 约2—3小时 | 6 |
| putian-jiuli-lake | 九鲤湖 | 约半天至1天 | 7 |
| putian-jiulong-valley | 九龙谷 | 约半天至1天 | 8、7 |
| putian-mulan-weir | 木兰陂 | 约1—2小时 | 9 |
| putian-shouxi-park | 绶溪公园 | 约1—2小时 | 10、2 |
| putian-city-museum | 莆田市博物馆 | 约2—3小时 | 11 |
| putian-xinghuafu | 兴化府历史文化街区 | 约2—4小时 | 3 |
| putian-baitang-lake | 白塘湖公园 | 约1—2小时 | 12、2 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Putian](https://en.wikivoyage.org/wiki/Putian) — CC BY-SA 4.0，Wikivoyage contributors。
2. [福建省人民政府 · 莆田城市文旅游线](https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/sdjj/wvjj/202303/t20230308_6127644.htm)
3. [福建省人民政府 · 兴化府历史文化街区](https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/flsxkmh/202605/t20260519_7149311.htm)
4. [湄洲妈祖祖庙 · 轮渡便民服务](https://www.mzmz.org.cn/ldbmfw.html)
5. [福建省人民政府 · 广化寺历史地段](https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/flsxkmh/202307/t20230705_6199982.htm)
6. [莆田南少林寺 · 官方网站](https://www.zgnsls.com/)
7. [福建省人民政府 · 九鲤湖与九龙谷](https://www.fujian.gov.cn/zwgk/ztzl/sxzygwzxsgzx/sdjj/wvjj/202402/t20240207_6393694.htm)
8. [九龙谷景区 · 官方网站](https://www.chinajlg.com/)
9. [福建省水利厅 · 木兰陂水利风景区](https://slt.fujian.gov.cn/wzsy/mtjj/202610/t20261010_7222783.htm)
10. [福建省水利厅 · 莆田绶溪公园](https://slt.fujian.gov.cn/ztzl/lsfzhzz/tshh/mlhh/202103/t20210329_5558210.htm)
11. [智慧海都 · 莆田市博物馆开放公告](https://www.hxdsb.com/html/content/bm/18945d6d758d410989b3248f50f5bc88.shtml)
12. [福建省水利厅 · 莆田市白塘湖](https://slt.fujian.gov.cn/ztzl/lsfzhzz/tshh/mlhh/202410/t20241025_6553982.htm)

### 温州（wenzhou / 浙江）

雁荡山整体计一景，灵峰/灵岩/大龙湫不拆；楠溪江整体计一景。永嘉、乐清、洞头、苍南、文成和瑞安分方向接驳。朔门古港遗址公园包含现场展示馆与考古陈列馆，整体计一景，与市府路温州博物馆主馆为不同地点。

本轮主引检查：文旅局2017经典线路直接打开持续超时；另一条城市主引温州博物馆官网可读。朔门古港专页可从官方搜索索引读到2026-04-15正文，直接抓取间歇超时。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| wenzhou-jiangxin | 江心屿 | 约半天 | 4、2 |
| wenzhou-yandangshan | 雁荡山 | 建议1—2天 | 5 |
| wenzhou-nanxijiang | 楠溪江 | 建议1—2天 | 6、2 |
| wenzhou-dongtou-wanghailou | 洞头望海楼 | 约1—2小时 | 2 |
| wenzhou-yuliao | 渔寮 | 约半天至1天 | 2 |
| wenzhou-city-museum | 温州博物馆 | 约2—3小时 | 3 |
| wenzhou-wuma-street | 五马街 | 约2—3小时 | 7 |
| wenzhou-tonglingshan | 铜铃山 | 约半天至1天 | 8 |
| wenzhou-yuhai-library | 玉海楼 | 约1—2小时 | 9 |
| wenzhou-shuomen-port | 朔门古港遗址公园 | 约1—2小时 | 10 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Wenzhou](https://en.wikivoyage.org/wiki/Wenzhou) — CC BY-SA 4.0，Wikivoyage contributors。
2. [温州市文化广电旅游局 · 十条经典旅游线路](https://wl.wenzhou.gov.cn/art/2017/10/7/art_1642046_34553207.html)
3. [温州博物馆 · 官方网站](https://www.wzmuseum.cn/index.aspx)
4. [浙江国际传播中心 · 江心屿](https://www.inzhejiang.com.cn/Travel/attractions/201908/t20190802_10716877.shtml)
5. [雁荡山景区 · 官方网站](https://www.wzyds.com/index.aspx)
6. [温州市楠溪江景区 · 官方网站](https://www.nxj.cn/)
7. [温州市档案馆 · 见证五马街](https://wzdag.wenzhou.gov.cn/art/2020/6/5/art_1219365_45149346.html)
8. [温州网 · 文成铜铃山森林旅游](https://news.66wz.com/system/2025/08/09/105695521.shtml)
9. [温州职业技术大学 · 玉海楼文化研学](https://www.wzvtc.cn/show/17/28708.html)
10. [温州博物馆 · 朔门古港遗址公园与展示馆](https://www.wzmuseum.cn/Art/Art_18/Art_18_12467.aspx)

### 湖州（huzhou / 浙江）

南浔、德清、安吉、长兴各有独立县区线路。莫干山内部建筑不拆，安吉竹博园与中南百草原为独立园区。衣裳街与飞英塔为老城不同目的地。

本轮主引检查：水利局2025六条幸福河湖线路正文可读，明确南浔、新市、荻港、莫干山等全市点位。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| huzhou-nanxun | 南浔古镇 | 约半天至1天 | 2 |
| huzhou-moganshan | 莫干山 | 建议1天；慢游可住1晚 | 4 |
| huzhou-xiazhuhu | 下渚湖国家湿地公园 | 约半天 | 5 |
| huzhou-xinshi | 新市古镇 | 约半天 | 6 |
| huzhou-yishang-street | 衣裳街 | 约2—3小时 | 3 |
| huzhou-feiying-pagoda | 飞英塔 | 约1小时 | 7 |
| huzhou-anji-bamboo | 安吉竹博园 | 约半天 | 8 |
| huzhou-zhongnan-baicao | 中南百草原 | 约半天至1天 | 9 |
| huzhou-datang-tea | 大唐贡茶院 | 约2—3小时 | 10 |
| huzhou-digang-village | 荻港古村 | 约半天 | 11、2 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Huzhou](https://en.wikivoyage.org/wiki/Huzhou) — CC BY-SA 4.0，Wikivoyage contributors。
2. [湖州市水利局 · 六条幸福河湖旅游线路](https://slj.huzhou.gov.cn/col/col1229209317/art/2025/art_897986780.html)
3. [湖州市文化广电旅游局 · 衣裳街历史文化街区](https://whgdlyj.huzhou.gov.cn/hzgov/front/s50/ztzl/dywhzd/20211112/i3073963.html)
4. [浙江省政府英文门户 · 莫干山](https://www.ezhejiang.gov.cn/2020-06/03/c_497515.htm)
5. [德清下渚湖湿地风景区 · 官方网站](https://www.xzhfjq.com/index.html)
6. [湖州市委统战部 · 新市古镇](https://hztz.huzhou.gov.cn/gathw/gzdt/20220124/i3118590.html)
7. [浙江省古塔保护信息采集平台 · 飞英塔](https://www.museum24h.com/guta/demo/basic_info.html?gt_mainDomain.id=22143b30de6211e4b1bb00163e003dd0)
8. [安吉竹博园 · 景区简介](https://www.cnbamboo.cn/zhuboyuan.html)
9. [中南百草原 · 景区简介](https://www.znc.cn/show-9345.html)
10. [长兴县人民政府 · 大唐贡茶院](https://www.zjcx.gov.cn/art/2022/5/26/art_1229211259_55691032.html)
11. [文化和旅游部 · 荻港村乡村旅游](https://www.mct.gov.cn/gtb/index.jsp?url=https%3A%2F%2Fwww.mct.gov.cn%2Fwlbphone%2Fwlbydd%2Fxxfb%2Fqglb%2Fqg%2F202511%2Ft20251103_963043.html)

### 金华（jinhua / 浙江）

婺州古城含古子城主要历史点整体计一景；双龙景区洞群不拆；横店影视城旗下片区整体计一景。兰溪诸葛/游埠、东阳横店/卢宅、义乌佛堂、浦江仙华山、武义牛头山、永康方岩均属金华地级市辖域，留出跨县接驳。

本轮主引检查：金华文旅市区介绍正文可读，含婺州古城、双龙景区；页面旧票价、班次与等级不用于本轮实时事实。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| jinhua-wuzhou-old-city | 婺州古城 | 约半天 | 2 |
| jinhua-shuanglong | 双龙景区 | 约半天至1天 | 4、2 |
| jinhua-zhuge-village | 诸葛八卦村 | 约半天 | 5 |
| jinhua-youbu | 游埠古镇 | 约半天 | 6 |
| jinhua-hengdian-world | 横店影视城 | 建议1—2天 | 7 |
| jinhua-dongyang-luzhai | 东阳卢宅 | 约2—3小时 | 8 |
| jinhua-fotang | 佛堂古镇 | 约半天 | 9 |
| jinhua-xianhuashan | 仙华山 | 约半天至1天 | 10 |
| jinhua-niutoushan | 牛头山国家森林公园 | 约半天至1天 | 11 |
| jinhua-fangyan | 方岩 | 约半天 | 12 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Jinhua](https://en.wikivoyage.org/wiki/Jinhua) — CC BY-SA 4.0，Wikivoyage contributors。
2. [金华文旅 · 市区景区介绍](https://v.jhwlv.com/app/index.php?a=site&c=site&do=detail&i=3&id=654&uniacid=3)
3. [婺州古城 · 特色美食](https://www.wuzhougucheng.com/mobile/goods/1118.html)
4. [浙江省政府英文门户 · 双龙景区游客中心](https://www.ezhejiang.gov.cn/jinhua/2021-09/22/c_663662.htm)
5. [中央纪委国家监委 · 兰溪诸葛村](https://www.ccdi.gov.cn/yaowenn/201506/t20150602_49147.html)
6. [兰溪文旅集团 · 游埠古镇](https://lxwljt.cn/list_8/21.html)
7. [横店影视城 · 景区概况](https://www.hengdianworld.com/_about/general.html)
8. [浙江省非物质文化遗产网 · 东阳卢宅营造技艺](https://www.zjich.cn/xiangmu/xiangmushow.html?id=303)
9. [义乌市人民政府 · 佛堂古镇文旅与城市更新](https://www.yw.gov.cn/art/2025/11/17/art_1229129928_59564734.html)
10. [浦江县人民政府 · 旅游浦江](https://www.pj.gov.cn/col/col1229172501/index.html)
11. [金华文旅 · 县域景区介绍](https://v.jhwlv.com/app/index.php?a=site&c=site&do=detail&i=3&id=649&uniacid=3)
12. [银泰集团 · 方岩景区山水与文化](https://www.china-yintai.com/zh-CN/news/detail/335)

### 嘉兴（jiaxing / 浙江）

南湖旅游区整体计一景，未把红船/湖心岛拆分；乌镇东西栅合计一景。乌镇属桐乡、西塘属嘉善，盐官与徐志摩故居在海宁，南北湖与绮园在海盐。月河、子城、南湖为主城不同目的地。

本轮主引检查：浙江省经济信息中心2026水乡保护专页和机关党建机场运营稿均可打开。前者正文日期为2026-04-27，URL虽含0424，引用保留原地址。

| 景点ID | 独立目的地 | 规划停留 | 来源序号 |
| --- | --- | --- | --- |
| jiaxing-nanhu | 南湖旅游区 | 约半天 | 4 |
| jiaxing-wuzhen | 乌镇 | 建议1天；慢游可住1晚 | 5 |
| jiaxing-xitang | 西塘古镇 | 约半天至1天 | 6 |
| jiaxing-yuehe | 月河历史街区 | 约2—3小时 | 2、4 |
| jiaxing-zicheng | 子城遗址公园 | 约1—2小时 | 7、2 |
| jiaxing-yanguan | 盐官观潮景区 | 约半天至1天 | 8 |
| jiaxing-nanbeihu | 南北湖 | 约半天至1天 | 9 |
| jiaxing-qiyuan | 绮园 | 约1—2小时 | 10 |
| jiaxing-xu-zhimo | 徐志摩故居 | 约1小时 | 11 |
| jiaxing-city-museum | 嘉兴博物馆 | 约2—3小时 | 12 |

来源索引（均为JSON原URL；城市级与景点级合并去重）：

1. [Wikivoyage · Jiaxing](https://en.wikivoyage.org/wiki/Jiaxing) — CC BY-SA 4.0，Wikivoyage contributors。
2. [浙江省经济信息中心 · 嘉兴江南水乡文化保护](https://zjic.zj.gov.cn/ywdh/shjs/202604/t20260424_24050579.shtml)
3. [嘉兴市机关党建 · 嘉兴南湖机场客运运营](https://jgdj.jiaxing.gov.cn/col/col1537177/art/2026/art_bdfba8a89a5c46cc8b0bdd37cfb9689d.html)
4. [文化和旅游部 · 嘉兴市南湖旅游区](https://sjfw.mct.gov.cn/site/dataservice/culdetails?curId=10&id=34885)
5. [乌镇景区 · 官方预订与游览服务](https://www.ewuzhen.com/)
6. [上海青浦区人民政府 · 西塘古镇](https://www.shqp.gov.cn/shqp/ggfw/mszt/jxjd/20210603/840329.html)
7. [南湖革命纪念馆 · 子城遗址公园开放](https://www.nanhujng.cn/dtjx/wbxx/202503/t20250306_3112559.shtml)
8. [人民日报 · 海宁盐官观潮旅行](https://www.peopleapp.com/column/30053180223-500007706852)
9. [嘉兴城市生活资讯 · 南北湖景区](https://www.ijiaxing.com.cn/tysz/nanbei_lake.html)
10. [嘉兴在线 · 海盐绮园园林与智慧景区](https://www.cnjxol.com/ly/202503/t20250306_3579504.shtml)
11. [上海市民政局 · 海宁文化游与徐志摩故居](https://mzj.sh.gov.cn/lnb-lyxx/20230424/5854edbb9c1040918e4a759dbd8253d9.html)
12. [嘉兴博物馆 · 官方网站](https://www.jiaxingmuseum.com/)

## 组内自检记录

- 10城、100景、110个唯一ID、94个不同来源URL；每个城市/景点均有来源与2026-10-27日期。已用本地Python确认每城10景、核心景点字段、每景至少2条提示及Wikivoyage授权信息。
- 已审阅地级市辖域与主要远郊安排；未发现把辖外城市景点误归本市，或把同一景区内部展厅/平台拆成多个景点的确定问题。独立性按完整目的地判断，不仅按票制或品牌判断。
- 待持续维护：温州2017经典线路抓取超时；淄博政府目录/名录正文抓取超时；日照旅游网含旧交通内容且当前运营主体未经本轮确认；莆田2023城市游线页面已标失效。上述限制已逐城说明，不能表述成全部来源均实时有效。
- 本轮只新增本来源索引，未编辑JSON，未运行全仓lint或UI测试，未提交、发布。
