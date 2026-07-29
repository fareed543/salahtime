<?php

namespace app\controllers;
use Yii;

use app\models\Customer;
use app\models\CustomerType;
use app\models\Masjid;
use app\models\Program;
use app\models\ProgramCustomer;
use yii\web\Response;
use yii\web\UploadedFile;
use yii\helpers\Html;

class AuthController extends \yii\web\Controller
{
    public function actions()
    {
        return [
            'options' => [
                'class' => 'yii\rest\OptionsAction',
            ],
        ];
    }

    public function actionIndex()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        return [
            'message' => 'Backend API is running',
        ];
    }


    public function behaviors()
    {

        // echo "here";
        // print_r(Yii::$app->params['allowedOrigins']);
        // exit;
        $behaviors = parent::behaviors();
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => Yii::$app->params['allowedOrigins'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Allow-Credentials' => Yii::$app->params['corsAllowCredentials'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Max-Age' => 86400,
            ],
        ];
        return $behaviors;
    }

    public function actionSendEmail($to, $emailType, $extraParams)
    {
        // 1: Welcome Email
        // 2: Credentials 
        // 3: Email Verification 
        // 4: Login  
        // 5: Forgot Password 
        // 6: Reset Password 
        // 7: Password Updated 

        $templateQuery = Yii::$app->db->createCommand("select * from bt_email_templates where id_email_template = 1");
        $templateData = $templateQuery->queryOne();

        $emailQuery = Yii::$app->db->createCommand("select * from bt_email where id_email = ".$emailType);
        $email = $emailQuery->queryOne();

        if (!$templateData || !$email) {
            Yii::error("Missing email template configuration for email type {$emailType}", __METHOD__);
            return false;
        }


        $from = Yii::$app->params['senderEmail'];
        $fromName = Yii::$app->params['senderName'];
        $subject = $email['subject'];    
        
        $htmlContent = str_replace("template_email_content" , $email['email_content'], $templateData['email_template']);

        $subjectContent = '<tr> <td align="center" style="font-size:18px;color:#f90;font-family:helvetica,arial,sans-serif">'.$subject.'</td></tr>';
        $htmlContent = str_replace("template_subject_content" , $subjectContent, $htmlContent);

        if($emailType == '3'){ // 3: Email Verfication
            if (!empty($extraParams['otp'])) {
                $otp = Html::encode($extraParams['otp']);
                $text = '<tr> <td align="center" style="font-family:helvetica,arial,sans-serif;color:#344767">
                   <p style="margin:0 0 12px;font-size:15px">Enter this OTP to verify your account:</p>
                   <div style="display:inline-block;padding:12px 28px;color:#f90;font-size:28px;font-weight:700;letter-spacing:8px;border:2px solid #f90;border-radius:8px">'.$otp.'</div>
                   <p style="margin:12px 0 0;font-size:13px;color:#6b7f9e">This OTP expires in 10 minutes.</p>
                 </td> </tr>
                 <tr> <td height="50" style="font-size:1px">&nbsp;</td></tr>';
            } else {
                $verificationUrl = \yii\helpers\Url::to([
                    '/auth/verifyemail',
                    'code' => $extraParams['code'],
                    'email' => $extraParams['email'],
                ], true);
                $text = '<tr> <td align="center">
                   <a href="'.Html::encode($verificationUrl).'" style="padding:10px 30px;font-family:helvetica,arial,sans-serif;color:#f90;font-size:16px;text-decoration:none;border:2px solid #f90;border-radius:8px">Verification Link</a>
                 </td> </tr>
                 <tr> <td height="50" style="font-size:1px">&nbsp;</td></tr>';
            }
            $htmlContent = str_replace("template_button_content" , $text, $htmlContent);
        } else if($emailType == '4'){ // 4: Login  
            $text = '<tr> <td align="center">
               <a href="'.Html::encode(rtrim(Yii::$app->params['frontendUrl'], '/')).'" style="padding:10px 30px;font-family:helvetica,arial,sans-serif;color:#f90;font-size:16px;text-decoration:none;border:2px solid #f90;border-radius:8px">Check activity</a>
             </td> </tr>
             <tr> <td height="50" style="font-size:1px">&nbsp;</td></tr>';
            $htmlContent = str_replace("template_button_content" , $text, $htmlContent);
        } else if($emailType == '5'){ // 5: Forgot Password
            $otp = Html::encode($extraParams['otp']);
            $text = '<tr> <td align="center" style="font-family:helvetica,arial,sans-serif;color:#344767">
               <p style="margin:0 0 12px;font-size:15px">Enter this OTP to reset your password:</p>
               <div style="display:inline-block;padding:12px 28px;color:#f90;font-size:28px;font-weight:700;letter-spacing:8px;border:2px solid #f90;border-radius:8px">'.$otp.'</div>
               <p style="margin:12px 0 0;font-size:13px;color:#6b7f9e">This OTP expires in 10 minutes.</p>
             </td> </tr>
             <tr> <td height="50" style="font-size:1px">&nbsp;</td></tr>';
            $htmlContent = str_replace("template_button_content" , $text, $htmlContent);
        } else{
            $text = '';
            $htmlContent = str_replace("template_button_content" , $text, $htmlContent);
        }

        if (Yii::$app->params['productionMode']) {
            $headers = "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "From: {$fromName} <{$from}>\r\n";
            $headers .= "Reply-To: {$from}\r\n";
            if (!empty($email['cc_email'])) {
                $headers .= "Cc: {$email['cc_email']}\r\n";
            }

            return mail($to, $subject, $htmlContent, $headers);
        }

        return Yii::$app->mailer->compose()
            ->setFrom([$from => $fromName])
            ->setTo($to)
            ->setSubject($subject)
            ->setHtmlBody($htmlContent)
            ->send();
    }



    public function actionRegister()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $data = Yii::$app->request->getBodyParams();
        if (!is_array($data) || empty($data)) {
            $rawBody = Yii::$app->request->rawBody;
            $data = json_decode($rawBody, true);
        }

        if (!is_array($data)) {
            Yii::$app->response->statusCode = 400;
            return [
                'error' => 'Invalid request body. Expected JSON payload.',
            ];
        }

        foreach (['name', 'email', 'password', 'phone'] as $field) {
            if (empty($data[$field])) {
                Yii::$app->response->statusCode = 422;
                return [
                    'error' => sprintf('Missing required field: %s', $field),
                ];
            }
        }

        $data['name'] = trim($data['name']);
        $data['email'] = strtolower(trim($data['email']));
        $data['phone'] = preg_replace('/\D+/', '', $data['phone']);

        if (strlen($data['name']) < 2) {
            Yii::$app->response->statusCode = 422;
            return ['key' => 'name', 'message' => 'Please enter your full name'];
        }
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            Yii::$app->response->statusCode = 422;
            return ['key' => 'email', 'message' => 'Please enter a valid email address'];
        }
        if (!preg_match('/^[0-9]{10}$/', $data['phone'])) {
            Yii::$app->response->statusCode = 422;
            return ['key' => 'phone', 'message' => 'Phone number must contain exactly 10 digits'];
        }
        if (strlen($data['password']) < 8) {
            Yii::$app->response->statusCode = 422;
            return ['key' => 'password', 'message' => 'Password must be at least 8 characters'];
        }

        if (Customer::find()->where(['email' => $data['email']])->exists()) {
            Yii::$app->response->statusCode = 409;
            return ['key' => 'email', 'message' => 'An account already exists with this email address'];
        }

        // Check if phone already exists
        $checkPhone = Customer::find()->where(['username' => $data['phone']])->one();
        if ($checkPhone) {
            Yii::$app->response->statusCode = 400;
            return [
                'key' => 'phone',
                'message' => 'Phone Number already exists',
            ];
        }

        if (!$checkPhone) {
            $otpLength = (int)Yii::$app->params['passwordResetOtpLength'];
            $otp = (string)random_int(10 ** ($otpLength - 1), (10 ** $otpLength) - 1);
            $expiresAt = time() + (int)Yii::$app->params['passwordResetOtpTtl'];
            $customer = new Customer();
            $customer->firstname = $data['name'];
            $customer->password = $data['password'];
            $customer->username = $data['phone'];
            $customer->phone = $data['phone'];
            $customer->email = $data['email'];
            $customer->active = 0;
            $customer->email_verification_code = null;
            $customer->mobile_verification_code = $expiresAt.':0:'.Yii::$app->security->generatePasswordHash($otp);
            $customer->email_verified = 0;
            $customer->image = 'no-image.jpg';

            if (!empty($data['registrationCode'])) {
                $program = Program::find()->where(['code' => $data['registrationCode']])->one();
                if (!$program) {
                    Yii::$app->response->statusCode = 404;
                    return ['error' => 'Invalid registration code. Program not found.'];
                }

                $customer->id_customer_type = 7;
                $customer->address = $data['address'] ?? '';
                $customer->masjid = $data['masjid'] ?? '';
                $customer->landmark = $data['landmark'] ?? '';
                $customer->occupation = $data['occupation'] ?? '';
                $customer->college_name = $data['college_name'] ?? '';
                $customer->company_name = $data['company_name'] ?? '';
                $customer->gender = $data['gender'] ?? 'm';

                if ($customer->save()) {
                    $programCustomer = new ProgramCustomer();
                    $programCustomer->role = 3;
                    $programCustomer->id_program = $program->id;
                    $programCustomer->id_customer = $customer->id;

                    if ($programCustomer->save() && $this->actionSendEmail($data['email'], '3', [
                        'name' => $data['name'],
                        'email' => $data['email'],
                        'otp' => $otp,
                    ])) {
                        Yii::$app->response->statusCode = 200;
                        return [
                            'message' => 'Account created. OTP received to email.',
                            'requiresOtp' => true,
                            'method' => 'email',
                            'email' => $data['email'],
                        ];
                    }
                }
            } elseif ($customer->save() && $this->actionSendEmail($data['email'], '3', [
                'name' => $data['name'],
                'email' => $data['email'],
                'otp' => $otp,
            ])) {
                Yii::$app->response->statusCode = 200;
                return [
                    'message' => 'Account created. OTP received to email.',
                    'requiresOtp' => true,
                    'method' => 'email',
                    'email' => $data['email'],
                ];
            }
        }

        Yii::$app->response->statusCode = 500;
        return [
            'error' => 'Something went wrong',
            'details' => isset($customer) && $customer instanceof Customer ? $customer->getErrors() : [],
        ];
    }

    public function actionResendRegistrationOtp()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = Yii::$app->request->getBodyParams();
        $email = strtolower(trim($data['email'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Yii::$app->response->statusCode = 422;
            return ['message' => 'Enter a valid email address'];
        }

        $user = Customer::find()->where(['email' => $email])->one();
        if (!$user) {
            Yii::$app->response->statusCode = 404;
            return ['message' => 'Email not found'];
        }
        if ((int)$user->email_verified === 1) {
            Yii::$app->response->statusCode = 409;
            return ['message' => 'Email is already verified'];
        }

        $existingOtp = explode(':', (string)$user->mobile_verification_code, 3);
        $otpTtl = (int)Yii::$app->params['passwordResetOtpTtl'];
        if (count($existingOtp) === 3 && ((int)$existingOtp[0] - $otpTtl) > (time() - 60)) {
            Yii::$app->response->statusCode = 429;
            return ['message' => 'Please wait one minute before requesting another OTP'];
        }

        $otpLength = (int)Yii::$app->params['passwordResetOtpLength'];
        $otp = (string)random_int(10 ** ($otpLength - 1), (10 ** $otpLength) - 1);
        $expiresAt = time() + $otpTtl;
        $user->mobile_verification_code = $expiresAt.':0:'.Yii::$app->security->generatePasswordHash($otp);
        if (!$user->save(false, ['mobile_verification_code'])) {
            Yii::$app->response->statusCode = 500;
            return ['message' => 'Unable to create OTP'];
        }

        if ($this->actionSendEmail($user->email, '3', ['otp' => $otp])) {
            return [
                'message' => 'OTP sent to your email address',
                'requiresOtp' => true,
                'method' => 'email',
                'email' => $user->email,
            ];
        }

        Yii::$app->response->statusCode = 500;
        return ['message' => 'Failed to send registration OTP'];
    }

    public function actionVerifyRegistrationOtp()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = Yii::$app->request->getBodyParams();
        $email = strtolower(trim($data['email'] ?? ''));
        $otp = trim((string)($data['otp'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[0-9]{4,10}$/', $otp)) {
            Yii::$app->response->statusCode = 422;
            return ['message' => 'Enter a valid email and OTP'];
        }

        $user = Customer::find()->where(['email' => $email])->one();
        $stored = $user ? (string)$user->mobile_verification_code : '';
        $otpData = explode(':', $stored, 3);
        if (!$user || count($otpData) !== 3) {
            Yii::$app->response->statusCode = 400;
            return ['message' => 'Invalid or expired OTP'];
        }

        [$expiresAt, $attempts, $otpHash] = $otpData;
        if ((int)$expiresAt < time() || (int)$attempts >= 5) {
            $user->mobile_verification_code = null;
            $user->save(false, ['mobile_verification_code']);
            Yii::$app->response->statusCode = 400;
            return ['message' => 'Invalid or expired OTP'];
        }

        if (!Yii::$app->security->validatePassword($otp, $otpHash)) {
            $attempts = (int)$attempts + 1;
            $user->mobile_verification_code = $expiresAt.':'.$attempts.':'.$otpHash;
            $user->save(false, ['mobile_verification_code']);
            Yii::$app->response->statusCode = 400;
            return ['message' => $attempts >= 5 ? 'OTP attempt limit reached' : 'Invalid OTP'];
        }

        $user->email_verified = 1;
        $user->active = 1;
        $user->mobile_verification_code = null;
        $user->email_verification_code = null;
        if (!$user->save(false, ['email_verified', 'active', 'mobile_verification_code', 'email_verification_code'])) {
            Yii::$app->response->statusCode = 500;
            return ['message' => 'Unable to verify account'];
        }

        $this->actionSendEmail($email, '8', null);
        $token = Yii::$app->security->generateRandomString(32);
        $user->authKey = Yii::$app->security->generatePasswordHash($token);
        $user->save(false, ['authKey']);

        $customerType = CustomerType::find()->where(['id_customer_type' => $user->id_customer_type])->one();

        return [
            'message' => 'Email verified successfully.',
            'id' => $user->id,
            'customerType' => $customerType ? $customerType->name : '',
            'customerTypeId' => $user->id_customer_type,
            'email' => $user->email,
            'phone' => $user->phone,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'image' => $user->image,
            'pincode' => $user->pincode,
            'imagePath' => Yii::$app->params['userImagePath'],
            'status' => null,
            'accessToken' => $user->authKey,
        ];
    }


    // public function actionRegister()
    // {
    //     $rawBody = Yii::$app->request->rawBody;
    //     $data = json_decode($rawBody, true);
        
    //     if($this->actionSendEmail($data['email'], '1', NULL)){


    //         $checkPhone = Customer::find()->where(['username' => $data['phone']])->one();
    //         if ($checkPhone) {
    //             Yii::$app->response->statusCode = 400;
    //             return \yii\helpers\Json::encode( [
    //                     'key' => 'phone',
    //                     'message' => 'Phone Number already exists',
    //             ]);
    //         }

    //         $checkEmail = Customer::find()->where(['email' => $data['email']])->one();
    //         // if ($checkEmail) {
    //         //     Yii::$app->response->statusCode = 400;
    //         //     return \yii\helpers\Json::encode( [
    //         //         'key' => 'email',
    //         //         'message' => 'Email already exists',
    //         //     ]);
    //         // }
    //         // && !$checkEmail
    //         if(!$checkPhone  ){
    //             $verification_code = random_bytes(20);
    //             $genetated_verification_code = bin2hex($verification_code);
            
    //             $customer = new Customer();

    //             $program = Program::find()->where(['registration_code' => '2025sehrisubscriber'])->one();

             

    //             if($data['registrationCode']) {
    //                 $customer->id_customer_type = 7; // if Ramadhan Regisration
    //                 $customer->address = $data['address'];
    //                 $customer->masjid = $data['masjid']; // Masjid name or ID
    //                 $customer->landmark = $data['landmark'];
    //                 $customer->occupation = $data['occupation'];
    //                 $customer->college_name = $data['college_name'];
    //                 $customer->company_name = $data['company_name'];
    //                 $customer->gender = $data['gender'];
    //                 // $customer->notes = $data['notes'];
       
    //             }
                
                 
    //             $customer->firstname = $data['name'];
    //             $customer->password = $data['password'];
    //             $customer->username = $data['phone'];
    //             $customer->phone = $data['phone'];
    //             $customer->email = $data['email'];
    //             $customer->active = 0;
    //             $customer->email_verification_code = $genetated_verification_code;
    //             $customer->email_verified = 0;
    //             $customer->image = 'no-image.jpg'; 
    //             $customer->save();

    //             $tempArray = [];
    //             $tempArray['name'] = $data['name'];
    //             $tempArray['email'] = $data['email'];
    //             $tempArray['code'] = $genetated_verification_code;

    //             if($this->actionSendEmail($data['email'], '3', $tempArray)){
    //                 Yii::$app->response->statusCode = 200;
    //                 return \yii\helpers\Json::encode(['success' => 'Record added successfully']);
    //             }else{
    //                 Yii::$app->response->statusCode = 500;
    //                 return \yii\helpers\Json::encode(['success' => 'Something went wrong']);
    //             }
    //         }
    //     }
    //     return \yii\helpers\Json::encode($data);
    // }

    public function actionLogout()
    {
        $headers = Yii::$app->request->headers; 
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();
            if ($user) {
                $user->authKey = null;
                $user->save(false);
                Yii::$app->response->statusCode = 200;
                Yii::$app->response->format = Response::FORMAT_JSON;
                return [
                    'message' => 'Logout successfully.',
                ];
            } else {
                Yii::$app->response->statusCode = 401;
                Yii::$app->response->format = Response::FORMAT_JSON;
                return [
                    'error' => 'Unauthorized',
                    'message' => 'UnAuthorized User.',
                ];
            }
        } else {
            Yii::$app->response->statusCode = 401;
            Yii::$app->response->format = Response::FORMAT_JSON;
            return [
                'error' => 'Unauthorized',
                'message' => 'UnAuthorized user',
            ];
        }
    }

    public function actionLogin() {
        Yii::$app->response->format = Response::FORMAT_JSON;

        $data = Yii::$app->request->getBodyParams();
        if (!is_array($data) || empty($data)) {
            $data = json_decode(Yii::$app->request->rawBody, true);
        }

        if (!is_array($data) || empty($data['phone']) || empty($data['password'])) {
            Yii::$app->response->statusCode = 422;
            return [
                'error' => 'Phone and password are required',
            ];
        }

        $user = Customer::find()->where(['phone' => $data['phone']])->one();
        if (!$user) {
            Yii::$app->response->statusCode = 400;
            return [
                'key' => 'phone',
                'message' => 'Invalid phone number or password',
            ];
        } else if ((string) $user->active === '0') {
            Yii::$app->response->statusCode = 400;
            return [
                'key' => 'email',
                'message' => 'Your Account Deactivated',
            ];
        } else if ($user && Yii::$app->security->validatePassword($data['password'], $user->password)) {
            $token = Yii::$app->security->generateRandomString(32);
            $user->authKey = Yii::$app->security->generatePasswordHash($token);
            $user->save();

            $customerType = CustomerType::find()->where(['id_customer_type' => $user->id_customer_type])->one();

            $response = [
                'id' => $user->id,
                'customerType' => $customerType->name,
                'customerTypeId' => $user->id_customer_type,
                'email' => $user->email,
                'phone' => $user->phone,
                'firstname' => $user->firstname,
                'lastname' => $user->lastname,
                'image' => $user->image,
                'pincode' => $user->pincode,
                'imagePath' => Yii::$app->params['userImagePath'],
                'status' => null,
                'accessToken' => $user->authKey

            ];
            Yii::$app->response->statusCode = 200;
            return $response;
        }else{
            Yii::$app->response->statusCode = 400;
            return [
                'key' => 'password',
                'message' => 'Invalid phone number or password',
            ];
        }
    }

    public function actionSocialLogin($provider, $returnUrl = '/')
    {
        if ($provider !== 'google') {
            return $this->redirectSocialError('Unsupported social sign-in provider.');
        }
        $config = $this->getSocialProviderConfig($provider);
        if (!$config || empty($config['clientId']) || empty($config['clientSecret']) || empty(Yii::$app->params['socialAuthStateKey'])) {
            return $this->redirectSocialError('Social sign-in is not configured on the server.');
        }

        $returnUrl = $this->sanitizeReturnUrl($returnUrl);
        $redirectUri = \yii\helpers\Url::to(['/auth/social-callback', 'provider' => $provider], true);
        $state = $this->createSocialState($provider, $returnUrl);
        $query = [
            'client_id' => $config['clientId'],
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => $config['scope'],
            'state' => $state,
        ];

        if ($provider === 'google') {
            $query['access_type'] = 'online';
            $query['prompt'] = 'select_account';
        }

        return $this->redirect($config['authorizeUrl'].'?'.http_build_query($query));
    }

    public function actionSocialCallback($provider)
    {
        if ($provider !== 'google') {
            return $this->redirectSocialError('Unsupported social sign-in provider.');
        }
        $config = $this->getSocialProviderConfig($provider);
        $state = $this->readSocialState(Yii::$app->request->get('state'));
        if (!$config || !$state || $state['provider'] !== $provider) {
            return $this->redirectSocialError('Invalid social sign-in request.');
        }
        if (Yii::$app->request->get('error')) {
            return $this->redirectSocialError('Social sign-in was cancelled.');
        }

        $code = Yii::$app->request->get('code');
        if (!$code) {
            return $this->redirectSocialError('The social provider did not return an authorization code.');
        }

        try {
            $redirectUri = \yii\helpers\Url::to(['/auth/social-callback', 'provider' => $provider], true);
            $token = $this->requestJson($config['tokenUrl'], [
                'client_id' => $config['clientId'],
                'client_secret' => $config['clientSecret'],
                'redirect_uri' => $redirectUri,
                'code' => $code,
                'grant_type' => 'authorization_code',
            ]);
            if (empty($token['access_token'])) {
                throw new \RuntimeException('The social provider did not return an access token.');
            }

            $profileUrl = $config['profileUrl'].(strpos($config['profileUrl'], '?') === false ? '?' : '&')
                .http_build_query(['access_token' => $token['access_token']]);
            $profile = $this->requestJson($profileUrl);
            $email = strtolower(trim($profile['email'] ?? ''));
            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new \RuntimeException('Your social account did not provide an email address.');
            }

            $user = Customer::find()->where(['email' => $email])->one();
            if (!$user) {
                $providerId = (string)($profile['sub'] ?? '');
                $phone = (string)(9000000000 + (abs(crc32($provider.':'.$providerId)) % 999999999));
                while (Customer::find()->where(['phone' => $phone])->exists()) {
                    $phone = (string)(((int)$phone + 1) % 10000000000);
                }

                $fullName = trim($profile['name'] ?? 'Salah Time User');
                $nameParts = preg_split('/\s+/', $fullName, 2);
                $user = new Customer();
                $user->firstname = $profile['given_name'] ?? $nameParts[0];
                $user->lastname = $profile['family_name'] ?? ($nameParts[1] ?? '');
                $user->username = $phone;
                $user->phone = $phone;
                $user->email = $email;
                $user->password = Yii::$app->security->generateRandomString(48);
                $user->email_verified = 1;
                $user->active = 1;
                $user->image = 'no-image.jpg';
                if (!$user->save()) {
                    throw new \RuntimeException(implode(' ', $user->getFirstErrors()));
                }
            }

            if ((string)$user->active === '0') {
                throw new \RuntimeException('Your account is deactivated.');
            }

            $user->authKey = Yii::$app->security->generatePasswordHash(
                Yii::$app->security->generateRandomString(32)
            );
            $user->save(false, ['authKey']);

            $loginUrl = rtrim(Yii::$app->params['frontendUrl'], '/').'/login?'.http_build_query([
                'social' => 'success',
                'returnUrl' => $state['returnUrl'],
            ]).'#'.http_build_query(['accessToken' => $user->authKey]);
            return $this->redirect($loginUrl);
        } catch (\Throwable $e) {
            Yii::error($e->getMessage(), __METHOD__);
            return $this->redirectSocialError($e->getMessage());
        }
    }

    private function getSocialProviderConfig($provider)
    {
        if ($provider === 'google') {
            return [
                'clientId' => Yii::$app->params['googleClientId'],
                'clientSecret' => Yii::$app->params['googleClientSecret'],
                'authorizeUrl' => 'https://accounts.google.com/o/oauth2/v2/auth',
                'tokenUrl' => 'https://oauth2.googleapis.com/token',
                'profileUrl' => 'https://openidconnect.googleapis.com/v1/userinfo',
                'scope' => 'openid email profile',
            ];
        }
        return null;
    }

    private function createSocialState($provider, $returnUrl)
    {
        $payload = rtrim(strtr(base64_encode(json_encode([
            'provider' => $provider,
            'returnUrl' => $returnUrl,
            'expires' => time() + 600,
        ])), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $payload, Yii::$app->params['socialAuthStateKey']);
        return $payload.'.'.$signature;
    }

    private function readSocialState($state)
    {
        if (!$state || strpos($state, '.') === false || empty(Yii::$app->params['socialAuthStateKey'])) {
            return null;
        }
        [$payload, $signature] = explode('.', $state, 2);
        $expected = hash_hmac('sha256', $payload, Yii::$app->params['socialAuthStateKey']);
        if (!hash_equals($expected, $signature)) {
            return null;
        }
        $decoded = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        return is_array($decoded) && ($decoded['expires'] ?? 0) >= time() ? $decoded : null;
    }

    private function requestJson($url, array $post = [])
    {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        if ($post) {
            curl_setopt($curl, CURLOPT_POST, true);
            curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($post));
        }
        $body = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        $data = json_decode((string)$body, true);
        if ($error || $status >= 400 || !is_array($data)) {
            $providerError = is_array($data['error'] ?? null)
                ? ($data['error']['message'] ?? '')
                : ($data['error'] ?? '');
            throw new \RuntimeException($providerError ?: ($data['error_description'] ?? $error ?: 'Social provider request failed.'));
        }
        return $data;
    }

    private function sanitizeReturnUrl($returnUrl)
    {
        return is_string($returnUrl) && strpos($returnUrl, '/') === 0 && strpos($returnUrl, '//') !== 0
            ? $returnUrl
            : '/';
    }

    private function redirectSocialError($message)
    {
        $url = rtrim(Yii::$app->params['frontendUrl'], '/').'/login?'.http_build_query([
            'error' => $message,
        ]);
        return $this->redirect($url);
    }


    public function actionForgotPassword()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = Yii::$app->request->getBodyParams();
        $method = strtolower($data['method'] ?? 'email');

        if (!in_array($method, Yii::$app->params['passwordRecoveryMethods'], true)) {
            Yii::$app->response->statusCode = 422;
            return ['message' => 'Selected recovery method is not available'];
        }

        if ($method === 'mobile') {
            $mobile = preg_replace('/\D+/', '', $data['mobile'] ?? $data['phone'] ?? '');
            if (!preg_match('/^[0-9]{10}$/', $mobile)) {
                Yii::$app->response->statusCode = 422;
                return ['message' => 'Enter a valid 10-digit mobile number'];
            }

            $user = Customer::find()->where(['phone' => $mobile])->one();
            if (!$user) {
                Yii::$app->response->statusCode = 404;
                return ['message' => 'Mobile number not found'];
            }

            $existingOtp = explode(':', (string)$user->mobile_verification_code, 3);
            $otpTtl = (int)Yii::$app->params['passwordResetOtpTtl'];
            if (count($existingOtp) === 3 && ((int)$existingOtp[0] - $otpTtl) > (time() - 60)) {
                Yii::$app->response->statusCode = 429;
                return ['message' => 'Please wait one minute before requesting another OTP'];
            }

            $otpLength = (int)Yii::$app->params['passwordResetOtpLength'];
            $otp = (string)random_int(10 ** ($otpLength - 1), (10 ** $otpLength) - 1);
            $expiresAt = time() + $otpTtl;
            $otpMarker = Yii::$app->security->generatePasswordHash($otp);
            $user->mobile_verification_code = $expiresAt.':0:'.$otpMarker;
            if (!$user->save(false, ['mobile_verification_code'])) {
                Yii::$app->response->statusCode = 500;
                return ['message' => 'Unable to create OTP'];
            }

            if (!$this->sendPasswordResetOtp($mobile, $otp)) {
                $user->mobile_verification_code = null;
                $user->save(false, ['mobile_verification_code']);
                Yii::$app->response->statusCode = 503;
                return ['message' => 'Unable to send OTP. Check the configured SMS sender and provider logs.'];
            }

            $response = [
                'message' => 'OTP sent to your mobile number',
                'requiresOtp' => true,
                'method' => 'mobile',
                'mobile' => $mobile,
            ];
            if (!Yii::$app->params['productionMode'] && Yii::$app->params['smsProvider'] === 'log') {
                $response['debugOtp'] = $otp;
            }
            return $response;
        }

        if (empty($data['email'])) {
            Yii::$app->response->statusCode = 422;
            return ['message' => 'Email is required'];
        }

        $email = strtolower(trim($data['email']));
        $user = Customer::find()->where(['email' => $email])->one();
        if (!$user) {
            Yii::$app->response->statusCode = 404;
            return ['message' => 'Email not found'];
        }

        $existingOtp = explode(':', (string)$user->mobile_verification_code, 3);
        $otpTtl = (int)Yii::$app->params['passwordResetOtpTtl'];
        if (count($existingOtp) === 3 && ((int)$existingOtp[0] - $otpTtl) > (time() - 60)) {
            Yii::$app->response->statusCode = 429;
            return ['message' => 'Please wait one minute before requesting another OTP'];
        }

        $otpLength = (int)Yii::$app->params['passwordResetOtpLength'];
        $otp = (string)random_int(10 ** ($otpLength - 1), (10 ** $otpLength) - 1);
        $expiresAt = time() + $otpTtl;
        $user->mobile_verification_code = $expiresAt.':0:'.Yii::$app->security->generatePasswordHash($otp);
        if (!$user->save(false, ['mobile_verification_code'])) {
            Yii::$app->response->statusCode = 500;
            return ['message' => 'Unable to create OTP'];
        }

        if($this->actionSendEmail($user->email, '5', ['otp' => $otp])){
            Yii::$app->response->statusCode = 200;
            return [
                'message' => 'OTP sent to your email address',
                'requiresOtp' => true,
                'method' => 'email',
                'email' => $user->email,
            ];
        }else{
            $user->mobile_verification_code = null;
            $user->save(false, ['mobile_verification_code']);
            Yii::$app->response->statusCode = 500;
            return ['message' => 'Failed to send password reset OTP'];
        }
        
    }

    public function actionPasswordRecoveryConfig()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $provider = Yii::$app->params['smsProvider'];
        return [
            'methods' => Yii::$app->params['passwordRecoveryMethods'],
            'mobileConfigured' => $provider === 'log'
                || ($provider === '2factor' && !empty(Yii::$app->params['twoFactorApiKey'])),
            'otpLength' => (int)Yii::$app->params['passwordResetOtpLength'],
        ];
    }

    public function actionVerifyPasswordResetOtp()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = Yii::$app->request->getBodyParams();
        $method = strtolower($data['method'] ?? 'email');
        $email = strtolower(trim($data['email'] ?? ''));
        $mobile = preg_replace('/\D+/', '', $data['mobile'] ?? '');
        $otp = trim((string)($data['otp'] ?? ''));

        if (!in_array($method, ['email', 'mobile'], true)
            || ($method === 'email' && !filter_var($email, FILTER_VALIDATE_EMAIL))
            || ($method === 'mobile' && !preg_match('/^[0-9]{10}$/', $mobile))
            || !preg_match('/^[0-9]{4,10}$/', $otp)) {
            Yii::$app->response->statusCode = 422;
            return ['message' => 'Enter a valid account and OTP'];
        }

        $identity = $method === 'mobile' ? ['phone' => $mobile] : ['email' => $email];
        $user = Customer::find()->where($identity)->one();
        $stored = $user ? (string)$user->mobile_verification_code : '';
        $otpData = explode(':', $stored, 3);
        if (!$user || count($otpData) !== 3) {
            Yii::$app->response->statusCode = 400;
            return ['message' => 'Invalid or expired OTP'];
        }

        [$expiresAt, $attempts, $otpHash] = $otpData;
        if ((int)$expiresAt < time() || (int)$attempts >= 5) {
            $user->mobile_verification_code = null;
            $user->save(false, ['mobile_verification_code']);
            Yii::$app->response->statusCode = 400;
            return ['message' => 'Invalid or expired OTP'];
        }
        $otpIsValid = Yii::$app->security->validatePassword($otp, $otpHash);
        if (!$otpIsValid) {
            $attempts = (int)$attempts + 1;
            $user->mobile_verification_code = $expiresAt.':'.$attempts.':'.$otpHash;
            $user->save(false, ['mobile_verification_code']);
            Yii::$app->response->statusCode = 400;
            return ['message' => $attempts >= 5 ? 'OTP attempt limit reached' : 'Invalid OTP'];
        }

        $resetToken = Yii::$app->security->generateRandomString(48);
        $user->email_verification_code = $resetToken;
        $user->mobile_verification_code = null;
        $user->save(false, ['email_verification_code', 'mobile_verification_code']);

        return [
            'message' => 'OTP verified',
            'method' => $method,
            'email' => $method === 'email' ? $email : null,
            'mobile' => $method === 'mobile' ? $mobile : null,
            'code' => $resetToken,
        ];
    }

    private function sendPasswordResetOtp($mobile, $otp)
    {
        $provider = Yii::$app->params['smsProvider'];
        if ($provider === 'log' && YII_ENV !== 'prod') {
            Yii::info(['event' => 'password_reset_otp', 'mobile' => $mobile, 'otp' => $otp], __METHOD__);
            return true;
        }
        if ($provider === '2factor') {
            return $this->sendPasswordResetOtpWithTwoFactor($mobile, $otp);
        }
        return false;
    }

    private function sendPasswordResetOtpWithTwoFactor($mobile, $otp)
    {
        $apiKey = Yii::$app->params['twoFactorApiKey'];
        if (!$apiKey || !$otp) {
            return false;
        }

        $url = 'https://2factor.in/API/V1/'
            .rawurlencode($apiKey).'/SMS/'
            .rawurlencode($mobile).'/'
            .rawurlencode($otp);
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
        ]);
        $body = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $error = curl_error($curl);
        curl_close($curl);
        $providerResponse = json_decode((string)$body, true);

        $successful = !$error
            && $status >= 200
            && $status < 300
            && strcasecmp((string)($providerResponse['Status'] ?? ''), 'Success') === 0;
        if (!$successful) {
            Yii::error([
                'event' => 'two_factor_sms_send_failed',
                'status' => $status,
                'error' => $error,
                'providerStatus' => $providerResponse['Status'] ?? null,
                'providerDetails' => $providerResponse['Details'] ?? null,
            ], __METHOD__);
        }

        return $successful;
    }

    public function actionResetPassword()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $data = Yii::$app->request->getBodyParams();

        foreach (['code', 'password', 'confirmPassword'] as $field) {
            if (empty($data[$field])) {
                Yii::$app->response->statusCode = 422;
                return ['message' => "{$field} is required"];
            }
        }

        $method = strtolower($data['method'] ?? 'email');
        $identity = $method === 'mobile'
            ? ['phone' => preg_replace('/\D+/', '', $data['mobile'] ?? '')]
            : ['email' => strtolower(trim($data['email'] ?? ''))];
        if (empty(reset($identity))) {
            Yii::$app->response->statusCode = 422;
            return ['message' => $method === 'mobile' ? 'Mobile number is required' : 'Email is required'];
        }
        $user = Customer::find()->where(array_merge($identity, [
            'email_verification_code' => $data['code'],
        ]))->one();
        if (!$user) {
            Yii::$app->response->statusCode = 400;
            return ['message' => 'Invalid or expired password reset request'];
        }

        if($data['password'] ==  $data['confirmPassword']){                
            $user->password = Yii::$app->security->generatePasswordHash($data['password']);
            $user->email_verification_code = null;
            if (!$user->save(false, ['password', 'email_verification_code'])) {
                Yii::$app->response->statusCode = 500;
                return ['message' => 'Unable to update password'];
            }
            $tempArray = [];
            if ($method === 'mobile' || empty($user->email) || $this->actionSendEmail($user->email, '6', $tempArray)) {
                Yii::$app->response->statusCode = 200;
                return ['message' => 'Password updated successfully.'];
            }
            Yii::$app->response->statusCode = 500;
            return ['message' => 'Password updated, but confirmation email could not be sent'];
        }else{
            Yii::$app->response->statusCode = 422;
            return ['message' => 'Passwords do not match.'];
        }
        
    }


    

    public function actionSaveProfile()
    { 
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();
            if($user){

                $oldImageName = $user->image;
            
                $user->firstname = Yii::$app->request->post('firstname');
                $user->lastname = Yii::$app->request->post('lastname');
                $user->date_of_birth = Yii::$app->request->post('date_of_birth');
                $user->phone = Yii::$app->request->post('phone');
                $user->gender = Yii::$app->request->post('gender');
                $user->active = Yii::$app->request->post('accountDeactivation');
                $user->offline_access = Yii::$app->request->post('enableOfflineAccess');
                $user->email_notification = Yii::$app->request->post('emailNotification');
                $user->pincode = Yii::$app->request->post('pincode');
                $user->address = Yii::$app->request->post('address');
                $user->landmark = Yii::$app->request->post('landmark');
                $user->masjid = Yii::$app->request->post('masjid');
                $user->company_name = Yii::$app->request->post('company_name');
                $user->college_name = Yii::$app->request->post('college_name');
                $user->occupation = Yii::$app->request->post('occupation');
                $user->designation = Yii::$app->request->post('designation');
                $user->notes = Yii::$app->request->post('notes');
                

                if(Yii::$app->request->post('password')){
                    $user->password = Yii::$app->security->generatePasswordHash(Yii::$app->request->post('password'));
                }
                
                $imageFile = UploadedFile::getInstanceByName('image');
                if ($imageFile) {
                    
                    $uploadPath = Yii::getAlias('@webroot') . '/users/';
                    if (!is_dir($uploadPath)) {
                        mkdir($uploadPath, 0775, true);
                    }
                    $imageName = time() . '_' . $imageFile->baseName . '.' . $imageFile->extension;
                    $imageFile->saveAs($uploadPath . $imageName);
                    $user->image = $imageName;
                    // $user->image = $imageName;   
                    // $image = Image::make($uploadPath . $imageName);
                    // $image->encode('jpg', 70); // Compress the image to JPEG format with 70% quality
                    // $image->fit(200, 200);
                    // $compressedImageName = 'wplus_' . $imageName;
                    // $image->save($uploadPath . $compressedImageName);
                    // $user->image = $compressedImageName;

                    if ($oldImageName && $oldImageName !== 'no-image.jpg') {
                        $oldImagePath = $uploadPath . $oldImageName;
                        if (file_exists($oldImagePath)) {
                            unlink($oldImagePath);
                        }
                    }
                }

                if ($user->save()) {   
                    
                    $customerType = CustomerType::find()->where(['id_customer_type' => $user->id_customer_type])->one();


                   

                    $response = [
                        // 'authKey' =>$user->date_updated ,
                        // 'date_created' => $user->date_updated ,
                        // 'date_updated' => $user->date_updated ,

                        'accessToken' => $user->authKey ,
                        'customerType' => $customerType->name,
                        'customerTypeId' => $user->id_customer_type,
                        
                        'email_verification_code' => $user->email_verification_code,
                        'email_verified' => $user->email_verified,
                        'firstname' => $user->firstname,
                        'id' => $user->id,
                        'id_customer_type' => $user->id_customer_type,
                        'image' => $user->image,
                       
                        'lastname' => $user->lastname,
                       
                        'phone' => $user->phone,
                       
                        'otp' => $user->otp,
                        'gender' => $user->gender,
                        'username' => $user->username,
                        'status' => $user->active, 
                        // 'offline_access' => $user->offline_access ,
                        // 'email_notification' => $user->email_notification,
                        // 'mobile_verification_code' => $user->mobile_verification_code,
                        // 'mobile_verified' => $user->mobile_verified,
                        // 'date_of_birth'=> $date_of_birth
                        // 'ipaddress' => $user->ipaddress,
                        'pincode'  => $user->pincode, 
                        'address'=> $user->address,  
                        'landmark'=> $user->landmark, 
                        'masjid' => $user->masjid, 
                        'company_name' => $user->company_name, 
                        'college_name' => $user->college_name, 
                        'occupation' => $user->occupation, 
                        'designation' => $user->designation, 
                        'notes'=> $user->notes, 
                        
                    ];

                    // $response['userData'] = $user;
                    $response['imagePath'] = Yii::$app->params['userImagePath'];
                    Yii::$app->response->statusCode = 200;
                    return \yii\helpers\Json::encode($response);
                } else {
                    Yii::$app->response->statusCode = 500;
                    return \yii\helpers\Json::encode(['error' => 'Failed to update profile']);
                }
            }
            
            if (!$user) {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
        }
    }
    
    public function actionProfile()
    { 
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $response['userData'] = Customer::find()->where(['authKey' => $token])->one();
            $response['imagePath'] = Yii::$app->params['userImagePath'];
            Yii::$app->response->statusCode = 200;
            return \yii\helpers\Json::encode($response); 
            
            if (!$user) {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
        }
        
    }


    public function actionVerifyemail()
    {
        $code = Yii::$app->getRequest()->getQueryParam('code');
        $email = Yii::$app->getRequest()->getQueryParam('email');

        $successMessage = '';

        if ($code && $email) {
            $customer = Customer::find()->where([
                'email_verification_code' => $code,
                'email' => $email,
            ])->one();
            if (!$customer) {
                $successMessage = "Something Went Wrong!";
            } else if ((int)$customer->email_verified === 0) {
                $customer->email_verified = 1;
                $customer->active = 1;
                $customer->email_verification_code = null;
                if ($customer->save() && $this->actionSendEmail($email, '8', null)) {
                    $successMessage = "Email verified Successfully!";
                }
            } else if ((int)$customer->email_verified === 1) {
                $successMessage = "Email is already Verified!";
            }
        } else {
            $successMessage = "Something Went Wrong!";
        }

        $encodedSuccessMessage = urlencode($successMessage);
        $redirectUrl = rtrim(Yii::$app->params['frontendUrl'], '/')."/login?status={$encodedSuccessMessage}";

        Yii::$app->response->redirect($redirectUrl)->send();
        Yii::$app->end();
    }


    public function actionCustomerTypes()
    {
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();

            if($user){
                $customerTypes = CustomerType::find()->orderBy(['id_customer_type' => SORT_DESC])->all();
                $response['customerTypes'] = $customerTypes;
                
                Yii::$app->response->statusCode = 200;
                return \yii\helpers\Json::encode($response);  
            } else {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
        }
    }

    public function actionUsers()
    {
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();

            if($user){
                $users = Customer::find()->orderBy(['id' => SORT_DESC])->all();
                $response['list'] = $users;
                $response['userImagePath'] = Yii::$app->params['userImagePath'];
                $response['imagePath'] = Yii::$app->params['userImagePath'];

                
                Yii::$app->response->statusCode = 200;
                return \yii\helpers\Json::encode($response);  
            } else {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
        }
    }


    public function actionUserDetails()
    { 
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();

            if($user){
                $rawBody = Yii::$app->request->rawBody;
                $data = json_decode($rawBody, true);
                $userId = $data['id'];
                $response['userData'] = Customer::find()
                    ->alias('c')
                    ->select([
                        'c.*',
                        'm.name AS masjid_name',
                    ])
                    ->leftJoin(Masjid::tableName() . ' m', 'm.id = c.masjid')
                    ->where(['c.id' => $userId])
                    ->asArray()
                    ->one();
                $response['imagePath'] = Yii::$app->params['userImagePath'];
                Yii::$app->response->statusCode = 200;
                return \yii\helpers\Json::encode($response); 
            } else {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'UnAuthorized']);
        }
        
    }


    public function actionCreateUser()
    {
        $headers = Yii::$app->request->headers;
        
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $authUser = Customer::find()->where(['authKey' => $token])->one();
    
            if ($authUser) {
                // Check if we are updating an existing user or adding a new one
                $userId = Yii::$app->request->post('id');
                if ($userId) {
                    $userData = Customer::find()->where(['id' => $userId])->one();
                } else {
                    $userData = new Customer(); // New user for creation
                }
    
                if (!$userData) {
                    Yii::$app->response->statusCode = 500;
                    return \yii\helpers\Json::encode(['error' => 'User Not Found']);
                }
    
                // If the user is found or is new, update/add user data
                $oldImageName = $userData->image;
    
                // Update user data from the request
                $userData->firstname = Yii::$app->request->post('firstname');
                $userData->lastname = Yii::$app->request->post('lastname');
                $userData->phone = Yii::$app->request->post('phone');
                $userData->gender = Yii::$app->request->post('gender');
                $userData->active = Yii::$app->request->post('accountDeactivation');
                $userData->offline_access = Yii::$app->request->post('enableOfflineAccess');
                $userData->email_notification = Yii::$app->request->post('emailNotification');
    

                $userData->address = Yii::$app->request->post('address');
                $userData->landmark = Yii::$app->request->post('landmark');
                $userData->masjid = Yii::$app->request->post('masjid');
                $userData->company_name = Yii::$app->request->post('company_name');
                $userData->college_name = Yii::$app->request->post('college_name');
                $userData->occupation = Yii::$app->request->post('occupation');
                $userData->notes = Yii::$app->request->post('notes');

                // Only set password if it's provided in the request
                if (Yii::$app->request->post('password')) {
                    $userData->password = Yii::$app->security->generatePasswordHash(Yii::$app->request->post('password'));
                }
    
                // Handle image upload
                $imageFile = UploadedFile::getInstanceByName('image');
                if ($imageFile) {
                    $uploadPath = Yii::getAlias('@webroot') . '/users/';
                    $imageName = time() . '_' . $imageFile->baseName . '.' . $imageFile->extension;
                    $imageFile->saveAs($uploadPath . $imageName);
                    $userData->image = $imageName;
    
                    // Remove old image if exists
                    if ($oldImageName) {
                        $oldImagePath = $uploadPath . $oldImageName;
                        if (file_exists($oldImagePath)) {
                            unlink($oldImagePath);
                        }
                    }
                }
    
                // Save the user data
                if ($userData->save()) {
                    $response = [
                        'email_verification_code' => $userData->email_verification_code,
                        'email_verified' => $userData->email_verified,
                        'firstname' => $userData->firstname,
                        'id' => $userData->id,
                        'id_customer_type' => $userData->id_customer_type,
                        'image' => $userData->image,
                        'ipaddress' => $userData->ipaddress,
                        'lastname' => $userData->lastname,
                        'mobile_verification_code' => $userData->mobile_verification_code,
                        'mobile_verified' => $userData->mobile_verified,
                        'otp' => $userData->otp,
                        'gender' => $userData->gender,
                        'phone' => $userData->phone,
                        'username' => $userData->username,
                        'active' => $userData->active,
                        'offline_access' => $userData->offline_access,
                        'address' => $userData->address,
                        'masjid' => $userData->masjid,
                        'landmark' => $userData->landmark,
                        'company_name' => $userData->email_notification,
                        'college_name' => $userData->college_name,
                        'occupation' => $userData->occupation,
                        'notes' => $userData->notes,
                        'email_notification' => $userData->email_notification,


                    ];
    
                    $response['imagePath'] = Yii::$app->params['userImagePath'];
                    Yii::$app->response->statusCode = 200;
                    return \yii\helpers\Json::encode($response);
                } else {
                    Yii::$app->response->statusCode = 500;
                    return \yii\helpers\Json::encode(['error' => 'Failed to save user data']);
                }
            } else {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
    }

    public function actionUpdateUser()
    {
        $headers = Yii::$app->request->headers;

        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $authUser = Customer::find()->where(['authKey' => $token])->one();

            if ($authUser) {
                // Get the user ID from the request
                $userId = Yii::$app->request->post('id');

                // Find the user to update
                $userData = Customer::find()->where(['id' => $userId])->one();
                if (!$userData) {
                    Yii::$app->response->statusCode = 404;
                    return \yii\helpers\Json::encode(['error' => 'User Not Found']);
                }

                $userData->firstname = Yii::$app->request->post('firstname');
                $userData->lastname = Yii::$app->request->post('lastname');
                $userData->phone = Yii::$app->request->post('phone');
                $userData->gender = Yii::$app->request->post('gender');
                $userData->id_customer_type = Yii::$app->request->post('id_customer_type');
                $userData->pincode = Yii::$app->request->post('pincode');
                $userData->address = Yii::$app->request->post('address');
                $userData->landmark = Yii::$app->request->post('landmark');
                $userData->masjid = Yii::$app->request->post('masjid');
                $userData->company_name = Yii::$app->request->post('company_name');
                $userData->college_name = Yii::$app->request->post('college_name');
                $userData->occupation = Yii::$app->request->post('occupation');
                $userData->designation = Yii::$app->request->post('designation');
                $userData->notes = Yii::$app->request->post('notes');

                // Only set password if it's provided in the request
                if (Yii::$app->request->post('password')) {
                    $userData->password = Yii::$app->security->generatePasswordHash(Yii::$app->request->post('password'));
                }

                // Store the old image name
                // $oldImageName = $userData->image;

                // Update user data from the request
                
                // $userData->phone = Yii::$app->request->post('phone', $userData->phone);
                // $userData->gender = Yii::$app->request->post('gender', $userData->gender);
                // $userData->active = Yii::$app->request->post('accountDeactivation', $userData->active);
                // $userData->offline_access = Yii::$app->request->post('enableOfflineAccess', $userData->offline_access);
                // $userData->email_notification = Yii::$app->request->post('emailNotification', $userData->email_notification);

                

                // Handle image upload
                // $imageFile = UploadedFile::getInstanceByName('image');
                // if ($imageFile) {
                //     $uploadPath = Yii::getAlias('@webroot') . '/users/';
                //     $imageName = time() . '_' . $imageFile->baseName . '.' . $imageFile->extension;
                //     $imageFile->saveAs($uploadPath . $imageName);
                //     $userData->image = $imageName;

                //     // Remove old image if exists
                //     if ($oldImageName) {
                //         $oldImagePath = $uploadPath . $oldImageName;
                //         if (file_exists($oldImagePath)) {
                //             unlink($oldImagePath);
                //         }
                //     }
                // }

                // Save the user data
                if ($userData->save()) {
                    $response = [
                        'email_verification_code' => $userData->email_verification_code,
                        'email_verified' => $userData->email_verified,
                        'firstname' => $userData->firstname,
                        'id' => $userData->id,
                        'id_customer_type' => $userData->id_customer_type,
                        'image' => $userData->image,
                        'ipaddress' => $userData->ipaddress,
                        'lastname' => $userData->lastname,
                        'mobile_verification_code' => $userData->mobile_verification_code,
                        'mobile_verified' => $userData->mobile_verified,
                        'otp' => $userData->otp,
                        'gender' => $userData->gender,
                        'phone' => $userData->phone,
                        'username' => $userData->username,
                        'active' => $userData->active,
                        'offline_access' => $userData->offline_access,
                        'email_notification' => $userData->email_notification,
                    ];

                    $response['imagePath'] = Yii::$app->params['userImagePath'];
                    Yii::$app->response->statusCode = 200;
                    return \yii\helpers\Json::encode($response);
                } else {
                    Yii::$app->response->statusCode = 500;
                    
                    return \yii\helpers\Json::encode([
                    'details' => $userData->getErrors(), 
                    'error' => 'Failed to update user data'
                    ]);
                }
            } else {
                Yii::$app->response->statusCode = 401;
                return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401;
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
    }

    public function actionDeleteUser() {
        $headers = Yii::$app->request->headers;
        if ($headers->has('Authorization')) {
            $authorizationHeader = $headers->get('Authorization');
            $token = str_replace('Bearer ', '', $authorizationHeader);
            $user = Customer::find()->where(['authKey' => $token])->one();
    
            if ($user) {
                $userId = Yii::$app->request->post('id');
                $customer = Customer::findOne($userId);
    
                if ($customer) {
                    // Start a transaction to ensure consistency
                    $transaction = Yii::$app->db->beginTransaction();
                    try {
                        // Delete records from ProgramCustomer table
                        ProgramCustomer::deleteAll(['id_customer' => $customer->id]);
    
                        // Delete records from bt_ramadan_sehri_subscription table
                        Yii::$app->db->createCommand()
                            ->delete('bt_ramadan_sehri_subscription', ['id_customer' => $customer->id])
                            ->execute();
    
                        // Now delete the customer record
                        if ($customer->delete()) {
                            $transaction->commit();
                            Yii::$app->response->statusCode = 204; // No Content
                            return \yii\helpers\Json::encode(['message' => 'User deleted successfully']);
                        } else {
                            $transaction->rollBack();
                            Yii::$app->response->statusCode = 500;
                            return \yii\helpers\Json::encode(['error' => 'Failed to delete user']);
                        }
                    } catch (\Exception $e) {
                        $transaction->rollBack();
                        Yii::$app->response->statusCode = 500;
                        return \yii\helpers\Json::encode(['error' => 'Failed to delete user', 'details' => $e->getMessage()]);
                    }
                } else {
                    Yii::$app->response->statusCode = 404; // Not Found
                    return \yii\helpers\Json::encode(['error' => 'User not found']);
                }
            } else {
                Yii::$app->response->statusCode = 401; // Unauthorized
                return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
            }
        } else {
            Yii::$app->response->statusCode = 401; // Unauthorized
            return \yii\helpers\Json::encode(['error' => 'Unauthorized']);
        }
    }
    


    public function beforeAction($action)
    {
        if (in_array($action->id, ['options', 'customer-types','update-user','create-user','delete-user', 'user-details', 'users', 'login', 'register','resend-registration-otp','verify-registration-otp','forgot-password','password-recovery-config','verify-password-reset-otp','reset-password', 'profile', 'save-profile','verifyemail', 'social-login', 'social-callback'])) {
            $this->enableCsrfValidation = false;
        }
        return parent::beforeAction($action);
    }

}
