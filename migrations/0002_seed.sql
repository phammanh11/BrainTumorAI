-- ============================================================================
-- BrainTumorAI - Dữ liệu khởi tạo (Seed Data) cho Cloudflare D1
-- Mật khẩu mặc định cho các tài khoản demo: "123456" (SHA-256 hex)
-- SHA-256("123456") = 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
-- ============================================================================

INSERT OR IGNORE INTO users (id, email, password_hash, role, full_name, created_at) VALUES
  ('usr-pat-01', 'benhnhan@neurocloud.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'patient', 'Nguyễn Minh Khôi', '2026-11-01T08:15:00Z'),
  ('usr-pat-02', 'tran.thi.lan@neurocloud.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'patient', 'Trần Thị Ngọc Lan', '2026-11-03T09:30:00Z'),
  ('usr-pat-03', 'le.hoang.nam@neurocloud.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'patient', 'Lê Hoàng Nam', '2026-11-05T14:20:00Z'),
  ('usr-doc-01', 'bs.hung@neurocloud.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'doctor', 'PGS.TS.BS Vũ Quốc Hùng', '2026-10-20T07:00:00Z'),
  ('usr-doc-02', 'bs.thao@neurocloud.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'doctor', 'ThS.BSCKII Đặng Phương Thảo', '2026-10-22T08:00:00Z'),
  ('usr-adm-01', 'admin@neurocloud.vn', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'admin', 'Quản trị Hệ thống Cloud', '2026-10-15T06:00:00Z');

INSERT OR IGNORE INTO patients (user_id, date_of_birth, phone, medical_code, gender) VALUES
  ('usr-pat-01', '1988-04-16', '0912 345 678', 'BN-2026-0891', 'Nam'),
  ('usr-pat-02', '1979-11-02', '0987 654 321', 'BN-2026-0892', 'Nữ'),
  ('usr-pat-03', '1994-07-25', '0905 112 233', 'BN-2026-0893', 'Nam');

INSERT OR IGNORE INTO doctors (user_id, specialty, license_no, hospital) VALUES
  ('usr-doc-01', 'Chẩn đoán hình ảnh Thần kinh & Ngoại Thần kinh', 'CCHN-004821/BYT', 'Bệnh viện Đại học Y Hà Nội'),
  ('usr-doc-02', 'Nội Thần kinh & Ung bướu Thần kinh', 'CCHN-009154/BYT', 'Bệnh viện Chợ Rẫy');

INSERT OR IGNORE INTO mri_scans (id, patient_id, r2_key, file_name, file_size, modality, clinical_note, uploaded_at) VALUES
  ('scan-1001', 'usr-pat-01', 'scans/2026-11/glioma_axial_t1ce_01.png', 'glioma_axial_t1ce_01.png', 48920, 'MRI Axial T1-CE (3.0T)', 'Bệnh nhân đau đầu vùng thái dương trái 3 tuần, nhìn mờ nhẹ.', '2026-11-10T08:30:00Z'),
  ('scan-1002', 'usr-pat-02', 'scans/2026-11/meningioma_convexity_02.png', 'meningioma_convexity_02.png', 51200, 'MRI Axial T1-W (1.5T)', 'Khám kiểm tra đau đầu mạn tính đỉnh phải, không nôn.', '2026-11-11T10:15:00Z'),
  ('scan-1003', 'usr-pat-01', 'scans/2026-11/notumor_followup_03.png', 'notumor_followup_03.png', 46310, 'MRI Axial T2-FLAIR (3.0T)', 'Chụp tầm soát định kỳ sức khỏe thần kinh.', '2026-11-11T15:40:00Z'),
  ('scan-1004', 'usr-pat-03', 'scans/2026-11/pituitary_sellar_04.png', 'pituitary_sellar_04.png', 49800, 'MRI Coronal/Axial Sellar', 'Rối loạn nội tiết prolactin, thu hẹp thị trường hai bên.', '2026-11-12T07:50:00Z');

INSERT OR IGNORE INTO predictions (id, scan_id, label, confidence, probabilities, model_version, inference_ms, created_at) VALUES
  ('pred-2001', 'scan-1001', 'Glioma', 0.9761, '{"Glioma":0.9761,"Meningioma":0.0042,"No Tumor":0.0091,"Pituitary":0.0024,"OOD":0.0082}', 'brain_mri_student.onnx (5-Fold Ensemble Distilled)', 38, '2026-11-10T08:30:02Z'),
  ('pred-2002', 'scan-1002', 'Meningioma', 0.9925, '{"Glioma":0.0021,"Meningioma":0.9925,"No Tumor":0.0028,"Pituitary":0.0009,"OOD":0.0017}', 'brain_mri_student.onnx (5-Fold Ensemble Distilled)', 35, '2026-11-11T10:15:02Z'),
  ('pred-2003', 'scan-1003', 'No Tumor', 0.9912, '{"Glioma":0.0027,"Meningioma":0.0019,"No Tumor":0.9912,"Pituitary":0.0016,"OOD":0.0026}', 'brain_mri_student.onnx (5-Fold Ensemble Distilled)', 33, '2026-11-11T15:40:02Z'),
  ('pred-2004', 'scan-1004', 'Pituitary', 0.9595, '{"Glioma":0.0023,"Meningioma":0.0131,"No Tumor":0.0121,"Pituitary":0.9595,"OOD":0.0130}', 'brain_mri_student.onnx (5-Fold Ensemble Distilled)', 41, '2026-11-12T07:50:02Z');

INSERT OR IGNORE INTO doctor_reviews (id, prediction_id, doctor_id, confirmed_label, note, created_at) VALUES
  ('rev-3001', 'pred-2001', 'usr-doc-01', 'Glioma', 'Đồng thuận với kết quả mô hình AI. Hình ảnh khối tổn thương nội trục bán cầu trái có ngấm thuốc dạng viền điển hình của u thần kinh đệm (Glioma). Đề nghị chụp cộng hưởng từ phổ (MRS) và hội chẩn Ngoại Thần kinh.', '2026-11-10T11:20:00Z'),
  ('rev-3002', 'pred-2002', 'usr-doc-01', 'Meningioma', 'Xác nhận u màng não (Meningioma) vùng vòm sọ phải, ranh giới rõ, bám màng cứng, không thấy phù não lan rộng. Khuyến nghị khám chuyên khoa Ngoại Thần kinh để đánh giá chỉ định theo dõi hoặc can thiệp.', '2026-11-11T14:05:00Z'),
  ('rev-3003', 'pred-2003', 'usr-doc-02', 'No Tumor', 'Xác nhận nhu mô não hai bán cầu đối xứng, hệ thống não thất bình thường, không phát hiện khối choán chỗ nội sọ.', '2026-11-11T17:10:00Z');

INSERT OR IGNORE INTO chat_sessions (id, user_id, title, created_at) VALUES
  ('sess-4001', 'usr-pat-01', 'Giải thích kết quả Glioma và hướng khám chuyên khoa', '2026-11-10T09:00:00Z');

INSERT OR IGNORE INTO chat_messages (id, session_id, sender, content, sources_json, created_at) VALUES
  ('msg-5001', 'sess-4001', 'user', 'Kết quả dự đoán ảnh MRI của tôi báo nhãn Glioma với độ tin cậy 97.6%. Nhãn Glioma nghĩa là gì và tôi cần làm gì tiếp theo?', NULL, '2026-11-10T09:00:10Z'),
  ('msg-5002', 'sess-4001', 'bot', 'Chào bạn, dựa trên cơ sở dữ liệu y khoa đã kiểm chứng của hệ thống:\n\n1. **Ý nghĩa nhãn Glioma (U thần kinh đệm):** Glioma là nhóm u nguyên phát phát sinh từ các tế bào thần kinh đệm (glial cells) nâng đỡ mô não. Trên ảnh MRI, mô hình AI nhận diện các đặc trưng hình thái vùng tổn thương nội trục tương đồng với nhóm Glioma trong bộ dữ liệu huấn luyện.\n2. **Lưu ý quan trọng về giới hạn AI:** Kết quả 97.6% phản ánh mức độ tương đồng về mặt hình ảnh học so với tập dữ liệu mẫu, **không phải kết luận chẩn đoán xác định hay phân độ mô bệnh học**.\n3. **Khuyến nghị bước tiếp theo:** Bạn nên mang toàn bộ phim chụp MRI gốc (file DICOM) và kết quả tham khảo này đến khám tại **Chuyên khoa Ngoại Thần kinh hoặc Chẩn đoán hình ảnh** để bác sĩ thăm khám lâm sàng, đánh giá chuỗi xung có tiêm thuốc đối quang từ và tư vấn hướng xử trí chính xác.', '[{"id":"faq-001","title":"Glioma (U thần kinh đệm) là gì và ý nghĩa trên ảnh MRI?","source":"WHO CNS5 & NCI Brain Tumors Guide"}]', '2026-11-10T09:00:14Z');

-- 9. Bộ dữ liệu hỏi đáp y tế chuẩn (7 nhóm chủ đề theo thiết kế RAG)
INSERT OR IGNORE INTO faq_documents (id, title, content, source, category, keywords, updated_at) VALUES
  ('faq-001',
   'Glioma (U thần kinh đệm) là gì và ý nghĩa nhãn Glioma của mô hình AI?',
   'Glioma (u thần kinh đệm) là loại u não nguyên phát bắt nguồn từ các tế bào thần kinh đệm (astrocytes, oligodendrocytes hoặc ependymal cells) có nhiệm vụ nâng đỡ và bảo vệ tế bào thần kinh. Trên ảnh chụp MRI, Glioma thường xuất hiện dưới dạng tổn thương nội trục (nằm bên trong nhu mô não), có thể có ranh giới không đều hoặc kèm vùng phù não xung quanh. Lưu ý: Nhãn dự đoán "Glioma" từ hệ thống AI chỉ phản ánh đặc trưng hình ảnh tương đồng với lớp Glioma trong tập dữ liệu huấn luyện, hoàn toàn không thay thế sinh thiết mô bệnh học hay chẩn đoán của bác sĩ chuyên khoa.',
   'Tổ chức Y tế Thế giới (WHO CNS5) & Viện Ung thư Quốc gia Hoa Kỳ (NCI)',
   'Kiến thức u não & Phân loại',
   'glioma, u thần kinh đệm, u nội trục, tế bào đệm, astrocytoma',
   '2026-11-01'),

  ('faq-002',
   'Meningioma (U màng não) là gì và đặc điểm thường gặp trên ảnh MRI?',
   'Meningioma (u màng não) là khối u phát triển từ lớp màng nhện bao bọc xung quanh não và tủy sống (nằm ngoài trục nhu mô não - extra-axial). Phần lớn u màng não (khoảng 80–85%) là lành tính và phát triển chậm. Trên ảnh MRI có tiêm thuốc đối quang từ, Meningioma thường có ranh giới rất rõ nét, ngấm thuốc đồng nhất và có thể kèm dấu hiệu "đuôi màng cứng" (dural tail sign). Người bệnh cần được bác sĩ Ngoại Thần kinh đánh giá kích thước, vị trí u và mức độ chèn ép để quyết định theo dõi định kỳ hay can thiệp.',
   'Hiệp hội U não Hoa Kỳ (ABTA) & Hướng dẫn Chẩn đoán hình ảnh Bộ Y tế',
   'Kiến thức u não & Phân loại',
   'meningioma, u màng não, lành tính, ngoài trục, màng cứng, dural tail',
   '2026-11-01'),

  ('faq-003',
   'Pituitary (U tuyến yên) là gì và có những biểu hiện lâm sàng nào?',
   'Pituitary tumor (đa số là u tuyến yên - Pituitary Adenoma) là khối u hình thành tại tuyến yên nằm ở vùng hố yên (sella turcica) nền sọ. Tuyến yên điều hòa nhiều hormone quan trọng của cơ thể. Do vị trí nằm sát giao thoa thị giác, u tuyến yên có thể gây ra hai nhóm biểu hiện: (1) Rối loạn nội tiết (tăng tiết prolactin, hormone tăng trưởng GH, ACTH hoặc suy tuyến yên) và (2) Chèn ép dây thần kinh thị giác gây giảm thị lực hoặc bán manh hai thái dương (thu hẹp tầm nhìn hai bên). Đa số u tuyến yên là lành tính và có thể điều trị hiệu quả bằng nội khoa hoặc phẫu thuật nội soi qua đường xoang bướm.',
   'Hội Nội tiết Lâm sàng & NHS UK Pituitary Conditions',
   'Kiến thức u não & Phân loại',
   'pituitary, u tuyến yên, adenoma, hố yên, nội tiết, prolactin, thị trường',
   '2026-11-01'),

  ('faq-004',
   'Nhãn "No Tumor" (Không phát hiện u) trên hệ thống có ý nghĩa gì?',
   'Nhãn "No Tumor" nghĩa là mô hình học sâu không phát hiện thấy các đặc trưng hình thái điển hình của 3 nhóm u (Glioma, Meningioma, Pituitary) trên lát cắt ảnh MRI được tải lên. Tuy nhiên, kết quả "No Tumor" KHÔNG đồng nghĩa với việc loại trừ 100% mọi bệnh lý thần kinh khác (như tổn thương mạch máu, viêm nhiễm, thoái hóa chất trắng hoặc khối u kích thước rất nhỏ nằm ở lát cắt khác). Nếu bạn vẫn có triệu chứng đau đầu, chóng mặt, tê yếu hoặc nhìn mờ, hãy thăm khám trực tiếp với bác sĩ chuyên khoa Nội Thần kinh.',
   'Tài liệu Hướng dẫn An toàn AI Y tế - Dự án BrainTumorAI',
   'MRI & Giải thích kết quả AI',
   'no tumor, không có u, bình thường, âm tính, giới hạn mô hình',
   '2026-11-01'),

  ('faq-005',
   'Các dấu hiệu cảnh báo (Red Flags) nào của u não cần đi khám hoặc cấp cứu ngay?',
   'Người bệnh cần đến cơ sở y tế chuyên khoa khám sớm hoặc cấp cứu ngay nếu xuất hiện các dấu hiệu cảnh báo đỏ (Red Flags) sau: (1) Đau đầu mới khởi phát hoặc thay đổi tính chất, đau tăng dần vào buổi sáng sớm kèm buồn nôn/nôn vọt; (2) Khởi phát cơn co giật (động kinh) lần đầu ở người trưởng thành; (3) Yếu liệt hoặc tê bì nửa người, méo miệng, nói khó; (4) Nhìn mờ nhanh, nhìn đôi (song thị) hoặc mất thị trường hai bên; (5) Thay đổi tính cách, suy giảm trí nhớ nhanh, lú lẫn hoặc ngủ gà. Đây là các biểu hiện có thể liên quan đến tăng áp lực nội sọ hoặc chèn ép vùng não chức năng.',
   'NICE Guidelines NG99 & Cẩm nang Cấp cứu Thần kinh',
   'Triệu chứng & Dấu hiệu cảnh báo',
   'triệu chứng, đau đầu, co giật, nôn vọt, nhìn mờ, yếu liệt, cấp cứu, red flags',
   '2026-11-01'),

  ('faq-006',
   'Các thuật ngữ thường gặp trong phiếu trả kết quả chụp MRI sọ não có ý nghĩa gì?',
   'Trong bản mô tả kết quả MRI sọ não của bác sĩ Chẩn đoán hình ảnh, một số thuật ngữ phổ biến gồm: (1) Chuỗi xung T1, T2, FLAIR, DWI: các chế độ thu tín hiệu từ trường khác nhau giúp quan sát cấu trúc giải phẫu, dịch não tủy và vùng phù não; (2) Ngấm thuốc đối quang từ (Contrast enhancement / Gadolinium): phản ánh mức độ tăng sinh mạch hoặc phá vỡ hàng rào máu não của tổn thương; (3) Nội trục (Intra-axial) vs. Ngoài trục (Extra-axial): tổn thương nằm trong nhu mô não hay nằm ngoài nhu mô (như màng não, tuyến yên); (4) Hiệu ứng choán chỗ (Mass effect) và đẩy lệch đường giữa (Midline shift): mức độ khối tổn thương chèn ép mô não lành xung quanh.',
   'Hội Điện quang và Y học hạt nhân Việt Nam',
   'MRI & Giải thích kết quả AI',
   'thuật ngữ mri, t1, t2, flair, đối quang từ, gadolinium, nội trục, ngoài trục, đường giữa',
   '2026-11-01'),

  ('faq-007',
   'Độ tin cậy (Confidence Score) của mô hình AI được tính như thế nào?',
   'Độ tin cậy (ví dụ 96.5%) là xác suất đầu ra sau hàm Softmax của mô hình mạng nơ-ron học sâu (được chưng cất tri thức từ tổ hợp Ensemble 5-fold gồm ConvNeXt, SwinV2 và EfficientNetV2). Con số này thể hiện mức độ chắc chắn về mặt toán học của mô hình khi đối chiếu ảnh đầu vào với 4 phân lớp đã học. Mô hình còn tích hợp lớp thứ 5 (Out-of-Distribution / OOD) để tự động từ chối các bức ảnh không phải MRI sọ não. Dù độ tin cậy cao đến đâu, kết quả AI vẫn chỉ là công cụ hỗ trợ sàng lọc tham khảo bước đầu.',
   'Báo cáo Kỹ thuật Mô hình BrainTumorAI (Mục 1.5 & 1.8)',
   'MRI & Giải thích kết quả AI',
   'độ tin cậy, xác suất, confidence, ensemble, convnext, swinv2, onnx, ood',
   '2026-11-01'),

  ('faq-008',
   'Các phương pháp điều trị u não hiện nay gồm những gì?',
   'Phác đồ điều trị u não phụ thuộc vào loại tế bào u, vị trí giải phẫu, kích thước, mức độ xâm lấn và thể trạng người bệnh. Các phương pháp chính bao gồm: (1) Theo dõi chủ động bằng MRI định kỳ (với các u lành tính kích thước nhỏ, không triệu chứng); (2) Phẫu thuật vi phẫu hoặc nội soi thần kinh (nhằm lấy tối đa khối u an toàn và lấy mẫu giải phẫu bệnh); (3) Xạ trị hoặc Xạ phẫu định vị (Gamma Knife, CyberKnife); (4) Hóa trị hoặc điều trị đích/miễn dịch theo phác đồ Ung bướu. Tuyệt đối không tự ý dùng thuốc hoặc áp dụng phương pháp truyền miệng chưa được kiểm chứng.',
   'Viện Ung thư Quốc gia (NCI) & Hướng dẫn Chẩn đoán Điều trị Bộ Y tế',
   'Điều trị & Chăm sóc',
   'điều trị, phẫu thuật, xạ trị, gamma knife, hóa trị, theo dõi định kỳ',
   '2026-11-01'),

  ('faq-009',
   'Cần chuẩn bị gì trước khi đi chụp MRI sọ não và khám chuyên khoa Thần kinh?',
   'Trước khi chụp MRI sọ não, người bệnh cần lưu ý: (1) Thông báo bắt buộc cho bác sĩ và kỹ thuật viên nếu trong cơ thể có thiết bị kim loại hoặc điện tử cấy ghép (máy tạo nhịp tim, ốc tai điện tử, clip kẹp phình mạch não, mảnh kim loại, van tim nhân tạo); (2) Tháo bỏ toàn bộ trang sức, đồng hồ, kẹp tóc, thẻ từ, thiết bị trợ thính trước khi vào phòng từ trường; (3) Nếu có chỉ định tiêm thuốc đối quang từ, cần thông báo tiền sử dị ứng và kết quả xét nghiệm chức năng thận; (4) Khi đi khám lại, hãy mang theo toàn bộ đĩa CD/USB chứa file DICOM hoặc phim MRI cũ để bác sĩ so sánh tiến triển.',
   'Hướng dẫn An toàn Cộng hưởng từ - Bệnh viện Đại học Y & Bệnh viện Chợ Rẫy',
   'FAQ & Hướng dẫn khám bệnh',
   'chuẩn bị chụp mri, kim loại, máy tạo nhịp tim, dị ứng, khám thần kinh, dicom',
   '2026-11-01'),

  ('faq-010',
   'Nguyên tắc bảo mật dữ liệu ảnh MRI và quyền riêng tư trên hệ thống đám mây Cloudflare',
   'Hệ thống BrainTumorAI tuân thủ nghiêm ngặt thiết kế bảo mật y tế: (1) Mật khẩu người dùng được băm mật mã trước khi lưu vào Cloudflare D1; (2) Phiên đăng nhập quản lý qua Cloudflare KV có thời hạn tự động hết hạn; (3) Ảnh chụp MRI lưu trên Cloudflare R2 ở chế độ riêng tư (Private Bucket), chỉ truy cập được thông qua Workers API sau khi xác thực đúng chủ sở hữu hoặc bác sĩ phụ trách; (4) Khi trình diễn học thuật (demo), hệ thống khuyến nghị chỉ sử dụng ảnh từ bộ dữ liệu công khai đã ẩn danh thông tin cá nhân.',
   'Thiết kế Bảo mật Hệ thống Điện toán Đám mây (Mục 1.8.3 & 1.8.9)',
   'Nguồn y khoa & An toàn hệ thống',
   'bảo mật, quyền riêng tư, cloudflare, r2, d1, kv, ẩn danh, dữ liệu y tế',
   '2026-11-01');
