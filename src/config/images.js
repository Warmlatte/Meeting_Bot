/**
 * 會議建立成功訊息的圖片 URL 配置
 * 新增圖片時，只需在 MEETING_SUCCESS_IMAGES 陣列中加入新的 URL
 */

const MEETING_SUCCESS_IMAGES = [
  "https://i.pinimg.com/736x/17/3c/4d/173c4d76b6e991848463e5bf3e5348dc.jpg",
  "https://i.pinimg.com/736x/f0/8b/c4/f08bc4dfe3291afc310a664cb444a8f8.jpg",
  "https://i.pinimg.com/736x/14/03/da/1403da97a66a72a7674466f9cca2286c.jpg",
  "https://i.pinimg.com/originals/56/a6/14/56a614261d423da1825452363174c685.gif",
  "https://i.pinimg.com/originals/e6/29/49/e6294964e26db35f05e41e25e689b19d.gif",
  "https://i.pinimg.com/736x/0b/1b/8d/0b1b8d1fb3539f5ceaf3e94e06be12f7.jpg",
  "https://i.pinimg.com/736x/6a/8f/87/6a8f87a918c79d11a682b614e47ded38.jpg",
  "https://i.pinimg.com/originals/0c/06/bf/0c06bf9748d1f0fe733af51151a7418f.gif",
  "https://i.pinimg.com/736x/de/52/e6/de52e6bdd91834db7bed06aadaabd94d.jpg",
];

/**
 * 隨機取得一張會議成功圖片 URL
 * @returns {string|null} - 隨機圖片 URL，如果陣列為空則回傳 null
 */
export function getRandomMeetingSuccessImage() {
  if (MEETING_SUCCESS_IMAGES.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * MEETING_SUCCESS_IMAGES.length);
  return MEETING_SUCCESS_IMAGES[randomIndex];
}

export default {
  MEETING_SUCCESS_IMAGES,
  getRandomMeetingSuccessImage,
};
