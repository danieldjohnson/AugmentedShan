#52 x 34
import cv2
import numpy as np
im = cv2.imread('../test3.jpg');
transform = cv2.getPerspectiveTransform(np.array([[252,175],[2008,25],[126,1250],[2071,1306]],np.float32),np.array([[1,2],[520,2],[0,340],[520,340]],np.float32))
corrected = cv2.warpPerspective(im, transform, (520,340))
cv2.imwrite('fullshan2.jpg',corrected)
