export type BusinessTypeSeed = {
  code: string;
  name: string;
  sortOrder: number;
};

export type BusinessIndustrySeed = {
  code: string;
  name: string;
  level: number;
  sortOrder: number;
};

export const BUSINESS_TYPE_SEEDS: BusinessTypeSeed[] = [
  { code: 'BT001', name: 'Công ty TNHH 1 thành viên', sortOrder: 1 },
  {
    code: 'BT002',
    name: 'Công ty TNHH 2 thành viên trở lên',
    sortOrder: 2,
  },
  { code: 'BT003', name: 'Công ty cổ phần', sortOrder: 3 },
  { code: 'BT004', name: 'Công ty hợp danh', sortOrder: 4 },
  { code: 'BT005', name: 'Doanh nghiệp tư nhân', sortOrder: 5 },
  { code: 'BT006', name: 'Hộ kinh doanh', sortOrder: 6 },
  { code: 'BT007', name: 'Hợp tác xã', sortOrder: 7 },
  { code: 'BT008', name: 'Chi nhánh', sortOrder: 8 },
];

const BUSINESS_INDUSTRY_SEED_TEXT = `0111|Trồng lúa
0112|Trồng ngô và cây lương thực có hạt khác
0113|Trồng cây lấy củ có chất bột
0114|Trồng cây mía
0115|Trồng cây thuốc lá, thuốc lào
0116|Trồng cây lấy sợi
0117|Trồng cây có hạt chứa dầu
0118|Trồng rau, đậu các loại và trồng hoa
0121|Trồng cây ăn quả
0122|Trồng cây lấy quả chứa dầu
0123|Trồng cây điều
0124|Trồng cây tiêu
0125|Trồng cây cao su
0126|Trồng cây cà phê
0127|Trồng cây chè
0128|Trồng cây gia vị, cây dược liệu
0129|Trồng cây công nghiệp lâu năm khác
0141|Chăn nuôi trâu, bò
0142|Chăn nuôi ngựa, lừa, la
0144|Chăn nuôi dê, cừu
0145|Chăn nuôi lợn
0146|Chăn nuôi gia cầm
0149|Chăn nuôi khác
0210|Trồng và chăm sóc rừng
0220|Khai thác gỗ
0311|Khai thác thủy sản biển
0312|Khai thác thủy sản nội địa
0321|Nuôi trồng thủy sản biển
0322|Nuôi trồng thủy sản nội địa
1010|Chế biến và bảo quản thịt
1020|Chế biến và bảo quản thủy sản
1030|Chế biến và bảo quản rau quả
1040|Sản xuất dầu, mỡ động, thực vật
1050|Chế biến sữa và các sản phẩm từ sữa
1061|Xay xát và sản xuất bột lương thực
1071|Sản xuất các loại bánh từ bột
1072|Sản xuất đường
1073|Sản xuất ca cao, sô cô la và mứt kẹo
1074|Sản xuất mì ống, mì sợi và các sản phẩm tương tự
1075|Sản xuất món ăn, thức ăn chế biến sẵn
1079|Sản xuất thực phẩm khác chưa phân vào đâu
1080|Sản xuất thức ăn gia súc, gia cầm và thuỷ sản
1101|Chưng, tinh cất và pha chế các loại rượu mạnh
1102|Sản xuất rượu vang
1103|Sản xuất bia và mạch nha chưng cất bia
1104|Sản xuất đồ uống không cồn, nước khoáng
1311|Chuẩn bị và kéo sợi dệt
1312|Dệt vải
1313|Hoàn thiện sản phẩm dệt
1410|May trang phục (trừ trang phục bằng da lông thú)
1520|Sản xuất giày, dép
1610|Cưa, xẻ, bào gỗ và bảo quản gỗ
1621|Sản xuất gỗ dán, gỗ lạng, ván ép và ván mỏng khác
1622|Sản xuất đồ gỗ xây dựng
1701|Sản xuất bột giấy, giấy và bìa
1702|Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa
1811|In ấn
2011|Sản xuất hóa chất cơ bản
2012|Sản xuất phân bón và hợp chất ni tơ
2013|Sản xuất chất dẻo và cao su tổng hợp dạng nguyên sinh
2021|Sản xuất thuốc trừ sâu và hóa chất lâm nghiệp khác
2022|Sản xuất sơn, vecni và các chất quét tương tự
2023|Sản xuất mỹ phẩm, xà phòng, chất tẩy rửa
2100|Sản xuất thuốc, hóa dược và dược liệu
2220|Sản xuất các sản phẩm từ chất dẻo
2394|Sản xuất xi măng, vôi và thạch cao
2410|Sản xuất sắt, thép, gang
2511|Sản xuất các cấu kiện kim loại
2610|Sản xuất linh kiện điện tử
2620|Sản xuất máy vi tính và thiết bị ngoại vi của máy vi tính
2630|Sản xuất thiết bị truyền thông
2640|Sản xuất sản phẩm điện tử dân dụng
2710|Sản xuất mô tơ, máy phát, biến thế điện, thiết bị phân phối
2720|Sản xuất pin và ắc quy
2732|Sản xuất dây, cáp điện và điện tử khác
2740|Sản xuất thiết bị chiếu sáng
2750|Sản xuất đồ điện gia dụng
2811|Sản xuất động cơ, tuabin (trừ động cơ máy bay, ô tô)
2910|Sản xuất ô tô và xe có động cơ khác
3011|Đóng tàu và cấu kiện nổi
3100|Sản xuất giường, tủ, bàn, ghế
3211|Sản xuất đồ kim hoàn và chi tiết liên quan
3230|Sản xuất dụng cụ thể dục, thể thao
3240|Sản xuất đồ chơi, trò chơi
3250|Sản xuất thiết bị, dụng cụ y tế, nha khoa
4100|Xây dựng nhà các loại
4210|Xây dựng công trình đường sắt và đường bộ
4220|Xây dựng công trình công ích (điện, nước, viễn thông)
4290|Xây dựng công trình kỹ thuật dân dụng khác
4311|Phá dỡ
4312|Chuẩn bị mặt bằng
4321|Lắp đặt hệ thống điện
4322|Lắp đặt hệ thống cấp, thoát nước, lò sưởi và điều hoà
4329|Lắp đặt hệ thống xây dựng khác
4330|Hoàn thiện công trình xây dựng
4390|Hoạt động xây dựng chuyên dụng khác
4511|Bán ô tô và xe có động cơ khác
4512|Đại lý bán ô tô và xe có động cơ khác
4520|Bảo dưỡng, sửa chữa ô tô và xe có động cơ khác
4530|Bán phụ tùng và các bộ phận phụ trợ của ô tô
4541|Bán mô tô, xe máy
4543|Bảo dưỡng và sửa chữa mô tô, xe máy
4610|Đại lý, môi giới, đấu giá hàng hóa
4620|Bán buôn nông, lâm sản nguyên liệu và động vật sống
4631|Bán buôn lương thực
4632|Bán buôn thực phẩm
4633|Bán buôn đồ uống
4634|Bán buôn sản phẩm thuốc lá, thuốc lào
4641|Bán buôn vải, hàng may sẵn, giày dép
4649|Bán buôn đồ dùng khác cho gia đình
4651|Bán buôn máy vi tính, thiết bị ngoại vi và phần mềm
4652|Bán buôn thiết bị và linh kiện điện tử, viễn thông
4653|Bán buôn máy móc, thiết bị và phụ tùng máy nông nghiệp
4659|Bán buôn máy móc, thiết bị và phụ tùng máy khác
4661|Bán buôn nhiên liệu rắn, lỏng, khí và các sản phẩm liên quan
4662|Bán buôn kim loại và quặng kim loại
4663|Bán buôn vật liệu, thiết bị lắp đặt khác trong xây dựng
4669|Bán buôn chuyên doanh khác chưa được phân vào đâu
4690|Bán buôn tổng hợp
4711|Bán lẻ trong các cửa hàng kinh doanh tổng hợp (siêu thị, tạp hóa)
4719|Bán lẻ khác trong các cửa hàng kinh doanh tổng hợp
4721|Bán lẻ lương thực trong các cửa hàng chuyên doanh
4722|Bán lẻ thực phẩm trong các cửa hàng chuyên doanh
4730|Bán lẻ nhiên liệu động cơ trong các cửa hàng chuyên doanh
4741|Bán lẻ máy vi tính, thiết bị ngoại vi, phần mềm và viễn thông
4752|Bán lẻ thiết bị ngũ kim, sơn, kính trong các cửa hàng chuyên doanh
4753|Bán lẻ thảm, đệm, chăn, màn, rèm cửa, vật liệu phủ tường và sàn
4771|Bán lẻ hàng may mặc, giày dép, hàng da trong cửa hàng chuyên doanh
4772|Bán lẻ thuốc, dụng cụ y tế, mỹ phẩm trong cửa hàng chuyên doanh
4773|Bán lẻ hàng hóa mới khác trong các cửa hàng chuyên doanh
4791|Bán lẻ theo yêu cầu thư tín hoặc internet (thương mại điện tử)
4799|Bán lẻ hình thức khác không qua cửa hàng
4911|Vận tải hành khách đường sắt
4912|Vận tải hàng hóa đường sắt
4921|Vận tải hành khách đường bộ trong nội thành, ngoại thành (xe buýt)
4922|Vận tải hành khách đường bộ khác (taxi, xe khách)
4933|Vận tải hàng hóa bằng đường bộ
5011|Vận tải hành khách đường biển
5012|Vận tải hàng hóa đường biển
5110|Vận tải hành khách đường hàng không
5120|Vận tải hàng hóa đường hàng không
5210|Kho bãi và lưu giữ hàng hóa
5224|Bốc xếp hàng hóa
5229|Hoạt động dịch vụ hỗ trợ khác liên quan đến vận tải (logistics)
5510|Dịch vụ lưu trú ngắn ngày (khách sạn, nhà nghỉ)
5590|Cơ sở lưu trú khác (ký túc xá, nhà trọ)
5610|Dịch vụ ăn uống phục vụ tại chỗ (nhà hàng, quán ăn)
5621|Cung cấp dịch vụ ăn uống theo hợp đồng (tiệc cưới, sự kiện)
5629|Dịch vụ ăn uống khác (căng tin, quán ăn nhanh)
5630|Dịch vụ phục vụ đồ uống (quán cà phê, giải khát, bar)
5811|Xuất bản sách
5812|Xuất bản danh bạ và các loại tương tự
5813|Xuất bản báo, tạp chí và các ấn phẩm định kỳ
5820|Xuất bản phần mềm
5911|Hoạt động sản xuất phim điện ảnh, phim video và chương trình truyền hình
5912|Hoạt động hậu kỳ
6110|Viễn thông có dây
6120|Viễn thông không dây
6201|Lập trình máy tính
6202|Tư vấn máy tính và quản trị hệ thống máy tính
6209|Hoạt động dịch vụ công nghệ thông tin và dịch vụ khác liên quan đến máy tính
6311|Xử lý dữ liệu, cho thuê hosting và các hoạt động liên quan
6312|Cổng thông tin
6411|Hoạt động ngân hàng trung ương
6419|Hoạt động trung gian tiền tệ khác (ngân hàng thương mại)
6420|Hoạt động công ty nắm giữ tài sản (Holding)
6430|Hoạt động quỹ tín thác, các quỹ và các tổ chức tài chính tương tự
6491|Hoạt động cho thuê tài chính
6492|Hoạt động cấp tín dụng khác (tiệm cầm đồ, cho vay tiêu dùng)
6511|Bảo hiểm nhân thọ
6512|Bảo hiểm phi nhân thọ
6612|Môi giới hợp đồng hàng hóa và chứng khoán
6619|Hoạt động hỗ trợ dịch vụ tài chính chưa phân vào đâu
6810|Kinh doanh bất động sản, quyền sử dụng đất thuộc chủ sở hữu, chủ sử dụng hoặc đi thuê
6820|Tư vấn, môi giới, đấu giá bất động sản, đấu giá quyền sử dụng đất
6910|Hoạt động pháp luật (luật sư, công chứng)
6920|Hoạt động kế toán, kiểm toán và tư vấn về thuế
7010|Hoạt động của văn phòng trụ sở chính
7020|Hoạt động tư vấn quản lý
7110|Hoạt động kiến trúc và tư vấn kỹ thuật có liên quan
7120|Kiểm tra và phân tích kỹ thuật
7211|Nghiên cứu khoa học và phát triển công nghệ trong lĩnh vực công nghệ sinh học
7310|Quảng cáo
7320|Nghiên cứu thị trường và thăm dò dư luận
7410|Hoạt động thiết kế chuyên dụng (thiết kế thời trang, nội thất)
7420|Hoạt động nhiếp ảnh
7490|Hoạt động chuyên môn, khoa học và công nghệ khác chưa phân vào đâu
7710|Cho thuê xe có động cơ
7730|Cho thuê máy móc, thiết bị và đồ dùng hữu hình khác không kèm người điều khiển
7810|Hoạt động của các đại lý môi giới lao động, việc làm
7820|Cung ứng và quản lý lao động tạm thời
7911|Đại lý du lịch
7912|Điều hành tua du lịch
8010|Dịch vụ bảo vệ tư nhân
8121|Vệ sinh chung nhà cửa
8211|Dịch vụ hành chính văn phòng tổng hợp
8230|Tổ chức giới thiệu và xúc tiến thương mại (sự kiện, hội chợ)
8511|Giáo dục tiểu học
8512|Giáo dục trung học cơ sở và trung học phổ thông
8521|Đào tạo sơ cấp
8522|Đào tạo trung cấp, cao đẳng
8531|Đào tạo đại học
8532|Đào tạo sau đại học
8551|Đào tạo thể thao và giải trí
8552|Đào tạo văn hoá nghệ thuật
8559|Giáo dục khác chưa phân vào đâu (trung tâm ngoại ngữ, tin học, bồi dưỡng văn hóa)
8610|Hoạt động của các bệnh viện, phòng khám
8620|Hoạt động nha khoa
8690|Hoạt động y tế khác chưa phân vào đâu
8710|Hoạt động chăm sóc sức khỏe điều dưỡng tập trung
8810|Hoạt động trợ giúp xã hội không tập trung đối với người già và người khuyết tật
9000|Hoạt động sáng tạo, nghệ thuật và giải trí
9102|Hoạt động của bảo tàng, nhà bảo tồn
9200|Hoạt động vui chơi giải trí và xổ số, cá cược
9311|Hoạt động của các cơ sở thể thao
9312|Hoạt động của các câu lạc bộ thể thao
9329|Hoạt động vui chơi giải trí khác chưa phân vào đâu
9511|Sửa chữa máy vi tính và thiết bị ngoại vi
9512|Sửa chữa thiết bị truyền thông (điện thoại)
9521|Sửa chữa sản phẩm điện tử dân dụng trong gia đình
9522|Sửa chữa thiết bị gia dụng và đồ dùng gia đình
9601|Giặt là, làm sạch các sản phẩm dệt và lông thú
9602|Dịch vụ cắt tóc, làm đầu, gội đầu
9603|Dịch vụ phục vụ cá nhân khác chưa phân vào đâu (spa, xông hơi)`;

export const BUSINESS_INDUSTRY_SEEDS: BusinessIndustrySeed[] =
  BUSINESS_INDUSTRY_SEED_TEXT.split('\n').map((line, index) => {
    const separatorIndex = line.indexOf('|');
    const code = line.slice(0, separatorIndex);
    const name = line.slice(separatorIndex + 1);

    return {
      code,
      name,
      level: 4,
      sortOrder: index + 1,
    };
  });
