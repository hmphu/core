'use strict';
//
//  translate.res.js
//  translate text
//
//  Created by thanhdh on 2015-12-17.
//  Copyright 2015 Fireflyinnov. All rights reserved.
//

module.exports = {
    en: {
        mail: {
            ccs: {
                subject: '[{{ticket.account}}] Update: {{ticket.title}}',
                txt_content: `You are registered as a CC on this support request ({{ticket.id}}). Reply to this email to add a comment to the request.\n{{ticket.comments_formatted}}`
            }
        }
    },
    vi: {
        mail: {
            ccs: {
                subject: '[{{ticket.account}}] Cập nhật: {{ticket.title}}',
                txt_content: `Bạn đã đăng ký để nhận CC từ yêu cầu ({{ticket.id}}). Trả lời email này để thêm bình luận vào yêu cầu.\n{{ticket.comments_formatted}}`
            }
        }
    }
};
