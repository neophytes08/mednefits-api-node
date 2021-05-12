<?php

webInputTier()
{

	$input = Input::all();

	$customer_id = PlanHelper::getCusomerIdToken();
	$plan_tier_id = null;
	if(!empty($input['plan_tier_id']) || $input['plan_tier_id'] != null) {
		$plan_tier = DB::table('plan_tiers')->where('plan_tier_id', $input['plan_tier_id'])->where('active', 1)->first();

		if(!$plan_tier) {
			return array('satus' => false, 'message' => 'Plan Tier not found.');
		}

		$plan_tier_id = $input['plan_tier_id'];
	}


	if(empty($input['employees']) || sizeof($input['employees']) == 0) {
		return array('satus' => false, 'message' => 'Employee/s is required.');
	}

	$planned = DB::table('customer_plan')
				->where('customer_buy_start_id', $customer_id)
				->orderBy('created_at', 'desc')
				->first();

	$plan_status = DB::table('customer_plan_status')
						->where('customer_plan_id', $planned->customer_plan_id)
						->orderBy('created_at', 'desc')
						->first();

	$total = $plan_status->employees_input - $plan_status->enrolled_employees;
	
	if($total <= 0) {
		return array(
			'status'	=> FALSE,
			'message'	=> "We realised the current headcount you wish to enroll is over the current vacant member seat/s."
		);
	}

	if($plan_tier_id) {
		$total_left_count = $plan_tier->member_head_count - $plan_tier->member_enrolled_count;

		if(sizeof($input['employees']) > $total_left_count) {
			return array(
				'status'	=> FALSE,
				'message'	=> "Current Member headcount you wish to enroll to this Plan Tier is over the current vacant member seat/s. Your are trying to enroll a total of ".sizeof($input['employees'])." of current total left of ".$total_left_count." for this Plan Tier"
			);
		}
	}


	// get active plan id for member
	$customer_active_plan_id = PlanHelper::getCompanyAvailableActivePlanId($customer_id);

	// if(!$customer_active_plan_id) {
	// 	$active_plan = DB::table('customer_active_plan')->where('customer_start_buy_id', $customer_id)->orderBy('created_at', 'desc')->first();
	// 	$customer_active_plan_id = $active_plan->customer_active_plan_id;
	// }

	$total_dependents_entry = 0;
	$total_dependents = 0;
	// check total depedents to be save
	foreach ($input['employees'] as $key => $employee) {
		if(!empty($employee['dependents']) && sizeof($employee['dependents']) > 0) {
			$total_dependents_entry += sizeof($employee['dependents']);
		}
	}

	$dependent_plan_status = DB::table('dependent_plan_status')
							->where('customer_plan_id', $planned->customer_plan_id)
							->orderBy('created_at', 'desc')
							->first();
	
	if($dependent_plan_status) {
		$total_dependents = $dependent_plan_status->total_dependents - $dependent_plan_status->total_enrolled_dependents;
	} else {
		return array('status' => false, 'message' => 'Dependent Plan is currently not available for this Company. Please purchase a dependent plan, contact Mednefits Team for more information.');
	}

	if($total_dependents <= 0) {
		return array(
			'status'	=> FALSE,
			'message'	=> "We realised the current dependent headcount you wish to enroll is over the current vacant member seat/s."
		);
	}

	if($plan_tier_id) {
		if($plan_tier->dependent_head_count > 0) {
			$plan_tier_dependent_total = $plan_tier->dependent_head_count - $plan_tier->dependent_enrolled_count;

			if($total_dependents_entry > $plan_tier_dependent_total) {
				return array(
					'status'	=> FALSE,
					'message'	=> "Current Dependent headcount you wish to enroll to this Plan Tier is over the current vacant member seat/s. Your are trying to enroll a total of ".$total_dependents_entry." of current total left of ".$plan_tier_dependent_total." for this Plan Tier"
				);
			}
		}
	}


	$customer_active_plan = DB::table('customer_active_plan')
								->where('customer_active_plan_id', $customer_active_plan_id)
								->first();

	$format = [];
	$temp_enroll = new TempEnrollment();
	$temp_dependent_enroll = new DependentTempEnrollment();
	foreach ($input['employees'] as $key => $user) {
		$credit = 0;
		$postal_code = null;

		if(!empty($user['postal_code']) && $user['postal_code'] != null) {
			$postal_code = $user['postal_code'];
		}
  
  $user['plan_start'] = date('Y-m-d', strtotime($user['plan_start']));
  $user['dob'] = date('Y-m-d', strtotime($user['dob']));
		$error_member_logs = PlanHelper::enrollmentEmployeeValidation($user, false);

		$temp_enrollment_data = array(
			'customer_buy_start_id'	=> $customer_id,
			'active_plan_id'		=> $customer_active_plan_id,
			'plan_tier_id'			=> $plan_tier_id,
			'first_name'			=> $user['first_name'],
			'last_name'				=> $user['last_name'],
			'nric'					=> $user['nric'],
			'dob'					=> $user['dob'],
			'email'					=> !empty($user['email']) ? $user['email'] : null,
			'mobile'				=> $user['mobile'],
			'job_title'				=> $user['job_title'],
			'credits'				=> $user['medical_credits'],
			'wellness_credits'		=> $user['medical_credits'],
			'start_date'			=> date('d/m/Y', strtotime($user['plan_start'])),
			'postal_code'			=> $postal_code,
			'error_logs'			=> serialize($error_member_logs)
		);

		try {
			$enroll_result = $temp_enroll->insertTempEnrollment($temp_enrollment_data);

			if($enroll_result) {
				if(!empty($user['dependents']) && sizeof($user['dependents']) > 0) {
					foreach ($user['dependents'] as $key => $dependent) {
						$dependent['plan_start'] = date('Y-m-d', strtotime($dependent['plan_start']));
						$error_dependent_logs = PlanHelper::enrollmentDepedentValidation($dependent);

						// get active plan id for member
						$depedent_plan_id = PlanHelper::getCompanyAvailableDependenPlanId($customer_id);

						if(!$depedent_plan_id) {
							$dependent_plan = DB::table('dependent_plans')
												->where('customer_plan_id', $customer_active_plan->plan_id )
												->orderBy('created_at', 'desc')
												->first();
							$depedent_plan_id = $dependent_plan->depedent_plan_id;
						}

						$temp_enrollment_dependent = array(
							'employee_temp_id'		=> $enroll_result->id,
							'dependent_plan_id'		=> $depedent_plan_id,
							'plan_tier_id'			=> $plan_tier_id,
							'first_name'			=> $dependent['first_name'],
							'last_name'				=> $dependent['last_name'],
							'nric'					=> $dependent['nric'],
							'dob'					=> $dependent['dob'],
							'plan_start'			=> $dependent['plan_start'],
							'relationship'			=> $dependent['relationship'],
							'error_logs'			=> serialize($error_dependent_logs)
						);

						$temp_dependent_enroll->createEnrollment($temp_enrollment_dependent);
					}
				}
			}
		} catch(Exception $e) {
			$email = [];
			$email['end_point'] = url('hr/create/employee_enrollment', $parameter = array(), $secure = null);
			$email['logs'] = 'Save Temp Enrollment - '.$e->getMessage();
			$email['emailSubject'] = 'Error log.';
			return $e;
			EmailHelper::sendErrorLogs($email);
			return array('status' => FALSE, 'message' => 'Failed to create enrollment employee. Please contact Mednefits team.', 'error' => $e);
		}
	}

	return array('status' => true);
}





public function createEmployeeBenefits(Request $request)
	{

		if(empty($request->get('code')) || $request->get('code') == null) {
			return array('status' => false, 'message' => 'Phone Code is required');
		}

		if(empty($request->get('phone')) || $request->get('phone') == null) {
			return array('status' => false, 'message' => 'Phone Number is required');
		}

		if(empty($request->get('corporate_id')) || $request->get('corporate_id') == null) {
			return array('status' => false, 'message' => 'Corporate ID is required');
		}

		if(empty($request->get('customer_id')) || $request->get('customer_id') == null) {
			return array('status' => false, 'message' => 'Customer ID is required');
		}

		if(empty($request->get('customer_plan_id')) || $request->get('customer_plan_id') == null) {
			return array('status' => false, 'message' => 'Customer Plan ID is required');
		}

		if(empty($request->get('first_name')) || $request->get('first_name') == null) {
			return array('status' => false, 'message' => 'First Name is required');
		}

		if(empty($request->get('last_name')) || $request->get('last_name') == null) {
			return array('status' => false, 'message' => 'Last Name is required');
		}

		if(empty($request->get('nric')) || $request->get('nric') == null) {
			return array('status' => false, 'message' => 'NRIC/FIN is required');
		}

		if(empty($request->get('plan_start')) || $request->get('plan_start') == null) {
			return array('status' => false, 'message' => 'Plan Start Date is required');
		}

		if(empty($request->get('package_group_id')) || $request->get('package_group_id') == null) {
			return array('status' => false, 'message' => 'Package Group ID is required');
		}

		if(empty($request->get('postal_code')) || $request->get('postal_code') == null) {
			return array('status' => false, 'message' => 'Postal Code is required');
		}

		if(empty($request->get('dob')) || $request->get('dob') == null) {
			return array('status' => false, 'message' => 'Date of Birth is required');
		}

		$dependent_status_enroll = false;
		$dependent_status_purchase = false;
		$dependent_status_exceed = false;

		if(!empty($request->get('email_address')) || !$request->get('email_address') == null) {
			$check_email = Users::where('Email', $request->get('email_address'))
			->where('UserType', 5)
			->where('Active', 1)
			->count();

			if($check_email > 0) {
				return array(
					'status'    => false,
					'message'   => 'Email Already Taken.'
				);
			}
		}

		$check_corporate = Corporate::where('corporate_id', $request->get('corporate_id'))->count();
		if($check_corporate == 0) {
			return array(
				'status'    => false,
				'message'   => 'Corporate does not exist.'
			);
		}

		$account = DB::table('customer_link_customer_buy')
		->where('corporate_id', $request->get('corporate_id'))
		->first();

		if(!$account) {
			return array(
				'status'    => false,
				'message'   => 'Customer Account does not exist.'
			);
		}

		// check nric duplicate
		// check for duplicate nric
		$nric_validation = \BenefitsPlanHelper::checkDuplicateNRIC($request->get('nric'));
		if($nric_validation) {
			return array('status' => false, 'message' => 'NRIC/FIN is assigned to other user. NRIC/FIN is unique for everyone.');
		}

		$customer_id = $account->customer_buy_start_id;

		// check the plan tier
		$plan_tier_id = null;
		if(!empty($request->get('plan_tier_id')) || $request->get('plan_tier_id') != null) {
			$plan_tier = DB::table('plan_tiers')->where('plan_tier_id', $request->get('plan_tier_id'))->where('active', 1)->first();

			if(!$plan_tier) {
				return array('satus' => false, 'message' => 'Plan Tier not found.');
			}

			$plan_tier_id = $request->get('plan_tier_id');
			$total_left_count = $plan_tier->member_head_count - $plan_tier->member_enrolled_count;

			if($total_left_count <= 0) {
				return array(
					'status'	=> FALSE,
					'message'	=> "Current Member headcount you wish to enroll to this Plan Tier is over the current vacant member seat/s. Your are trying to enroll a total of ".sizeof($input['employees'])." of current total left of ".$total_left_count." for this Plan Tier"
				);
			}

			if(!empty($request->get('dependents')) && sizeof($request->get('dependents')) > 0) {
				// check dependent plan tier
				$total_dependent_left_count = $plan_tier->dependent_head_count - $plan_tier->dependent_enrolled_count;
				if($total_dependent_left_count <= 0) {
					$dependent_status_exceed = true;
				}
			}
		}

		$planned = DB::table('customer_plan')
		->where('customer_buy_start_id', $customer_id)
		->orderBy('created_at', 'desc')
		->first();

		$plan_status = DB::table('customer_plan_status')
		->where('customer_plan_id', $planned->customer_plan_id)
		->orderBy('created_at', 'desc')
		->first();

		// get dependent status
		$dependent_status = DB::table('dependent_plan_status')
		->where('customer_plan_id', $planned->customer_plan_id)
		->orderBy('created_at', 'desc')
		->first();
		$total_dependents = 0;
		if($dependent_status) {
			$total_dependents = $dependent_status->total_dependents - $dependent_status->total_enrolled_dependents;
			if($total_dependents <= 0) {
				$dependent_status_exceed = true;
			}
			$dependent_status_purchase = true;
		}

		$total = $plan_status->employees_input - $plan_status->enrolled_employees;

		if($total <= 0) {
			return array(
				'status'	=> FALSE,
				'message'	=> "We realised the current headcount  you wish to enroll is over the current vacant member seat/s."
			);
		}

		$pw = self::get_random_password(8);

		if($request->get('email_address')) {
			$communication_type = "email";
		} else {
			$communication_type = "sms";
		}

		$user_data = array(
			'Name' => $request->get('first_name').' '.$request->get('last_name'),
			'UserType' => 5,
			'Email' => $request->get('email_address'),
			'NRIC' => $request->get('nric'),
			'PhoneCode' => $request->get('code'),
			'PhoneNo' => $request->get('phone'),
			'Age' => 0,
			'Bmi' => 0,
			'Weight' => 0,
			'Height' => 0,
			'Image' => 'https://res.cloudinary.com/www-medicloud-sg/image/upload/v1427972951/ls7ipl3y7mmhlukbuz6r.png',
			'OTPCode' => '',
			'OTPStatus' => 0,
			'ClinicID' => null,
			'TimeSlotDuration' => '',
			'DOB' => date('Y-m-d', strtotime($request->get('dob'))),
			'Blood_Type' => '',
			'Insurance_Company' => '',
			'Insurance_Policy_No' => '',
			'Lat' => '',
			'Lng' => '',
			'Recon' => 0,
			'Address' => '',
			'City' => '',
			'State' => '',
			'Country' => '',
			'Zip_Code' => $request->get('postal_code'),
			'Ref_ID' => 0,
			'ActiveLink' => null,
			'Status' => 0,
			'source_type' => 1,
			'created_at' => time(),
			'updated_at' => time(),
			'Active' => 1,
			'Password' => md5($pw),
			'communication_type' => $communication_type
		);

		$user_data_save = Users::create($user_data);
       	// return $user_data_save;
		$user_id = $user_data_save->id;


		if($user_data_save) {
			$result = Wallet::updateOrCreate(['UserID' => $user_id, 'balance' => 0, 'wellness_balance' => 0]);
			$user_credits = DB::table('e_wallet')->where('UserID', $user_id)->first();
			$wallet = WalletHistory::create(['wallet_id' => $user_credits->wallet_id, 'credit' => 0, 'logs' =>
				'wallet_created']);

			if($result) {
				$corp = CorporateMembers::create(['corporate_id' => $request->get('corporate_id'), 'user_id' => $user_id, 'first_name' => $request->get('first_name'), 'last_name' => $request->get('last_name'), 'type' => 'member' ]);
				if($corp) {
					$bundle = Bundle::where('package_group_id', $request->get('package_group_id'))->get();
					foreach ($bundle as $key => $value) {
						UserPackage::create(['care_package_id' => $value->care_package_id, 'user_id' => $user_id, 'plan_type' => 'corporate']);
					}
					if($request->get('fixed') == "0" || $request->get('fixed') == 0) {
						$duration = $request->get('duration');
					} else {
						$duration = '1 year';
					}

					UserPlanType::create(['user_id' => $user_id, 'package_group_id' => $request->get('package_group_id'), 'duration' => $duration, 'plan_start' => date('Y-m-d', strtotime($request->get('plan_start'))), 'fixed' => $request->get('fixed')]);

                    // $active_plan = CorporateActivePlan::where('plan_id', $request->get('customer_plan_id'))->orderBy('created_at', 'desc')->first();
					$customer_active_plan_id = \UserHelper::getCompanyAvailableActivePlanId($request->get('customer_id'));

					if(!$customer_active_plan_id) {
						$active_plan = CorporateActivePlan::where('plan_id', $request->get('customer_plan_id'))->orderBy('created_at', 'desc')->first();
						$customer_active_plan_id = $active_plan->customer_active_plan_id;
					} else {
						$active_plan = CorporateActivePlan::where('customer_active_plan_id', $customer_active_plan_id)->orderBy('created_at', 'desc')->first();
					}

					UserPlanHistory::create(['user_id' => $user_id, 'customer_active_plan_id' => $customer_active_plan_id, 'type' => 'started', 'date' => date('Y-m-d', strtotime($request->get('plan_start')))]);

					CustomerPlanStatus::where('customer_plan_id', $request->get('customer_plan_id'))->increment('enrolled_employees', 1);

					// add credits for medical
					$customer_credits = CustomerCredits::where("customer_id", $request->get('customer_id'))->first();

					if($request->get('medical_amount') > 0) {
						if($customer_credits->balance >= $request->get('medical_amount')) {
							try {
								$user_credits_result = Wallet::where("UserID", $user_id)->increment("balance", $request->get('medical_amount'));
								if($user_credits_result) {
									// credit log for wellness
									$user_credits_logs = array(
										'wallet_id'				=> $user_credits->wallet_id,
										'credit'				=> $request->get('medical_amount'),
										'logs'					=> 'added_by_hr',
										'running_balance'		=> $user_credits->balance + $request->get('medical_amount'),
										'customer_active_plan_id' => $customer_active_plan_id
									);

									WalletHistory::create($user_credits_logs);
							 	 	// deduct company credits from employee allocation
									$company_credits_result = CustomerCredits::where('customer_id', $request->get('customer_id'))->decrement('balance', $request->get('medical_amount'));

									$company_credit_logs = array(
										'customer_credits_id' 	=> $customer_credits->customer_credits_id,
										'credit'				=> $request->get('medical_amount'),
										'logs'					=> 'added_employee_credits',
										'user_id'				=> $user_id,
										'running_balance'		=> $customer_credits->balance - $request->get('medical_amount'),
										'customer_active_plan_id' => $customer_active_plan_id
									);
									CustomerCreditLogs::create($company_credit_logs);

								}
							} catch(Exception $e) {
								return response()->json(['status' => FALSE, 'message' => $e->getMessage()]);
							}
						}
					} 

					if($request->get('wellness_amount') > 0) {
						if($customer_credits->wellness_credits >= $request->get('wellness_amount')) {
							try {
								$user_credits_result = Wallet::where("UserID", $user_id)->increment("wellness_balance", $request->get('wellness_amount'));
								if($user_credits_result) {
									// credit log for wellness
									
									$user_credits_logs = array(
										'wallet_id'				=> $user_credits->wallet_id,
										'credit'				=> $request->get('wellness_amount'),
										'logs'					=> 'added_by_hr',
										'running_balance'		=> $user_credits->wellness_balance + $request->get('credits'),
										'customer_active_plan_id' => $customer_active_plan_id
									);

									WellnessWalletHistory::create($user_credits_logs);

							 	 	// deduct company credits from employee allocation
									$company_credits_result = CustomerCredits::where('customer_id', $request->get('customer_id'))->decrement('wellness_credits', $request->get('wellness_amount'));

									$company_credit_logs = array(
										'customer_credits_id' 	=> $customer_credits->customer_credits_id,
										'credit'				=> $request->get('wellness_amount'),
										'logs'					=> 'added_employee_credits',
										'user_id'				=> $user_id,
										'running_balance'		=> $customer_credits->wellness_credits - $request->get('wellness_amount'),
										'customer_active_plan_id' => $customer_active_plan_id
									);
									CustomerWellnessLogs::create($company_credit_logs);
								}
							} catch(Exception $e) {
								return response()->json(['status' => FALSE, 'message' => $e->getMessage()]);
							}
						}
					}
					
          // plan tier
					if($plan_tier_id) {
						$plan_tier = DB::table('plan_tiers')
						->where('plan_tier_id', $plan_tier_id)
						->first();
						if($plan_tier) {
							$tier_history = array(
								'plan_tier_id'              => $plan_tier_id,
								'user_id'                   => $user_id,
								'status'                    => 1,
								'created_at'                => date('Y-m-d H:i:s'),
								'updated_at'                => date('Y-m-d H:i:s')
							);

							DB::table('plan_tier_users')->insert($tier_history);
                // increment member head count
							DB::table('plan_tiers')
							->where('plan_tier_id', $plan_tier_id)
							->increment('member_enrolled_count');
						}
					}

					// check add dependents
					if($dependent_status_purchase == true && $dependent_status_exceed == false) {
						if(sizeof($request->get('dependents')) > 0) {
							\BenefitsPlanHelper::enrollDependent($request->get('dependents'), $user_id, $customer_id, $planned->customer_plan_id, $plan_tier_id);
						}
					}

					$admin_id = \AdminHelper::getAdminID();
					if($admin_id) {
						$user_data['user_id'] = $user_id;
						$admin_logs = array(
							'admin_id'	=> $admin_id,
							'type'		=> 'created_company_employee',
							'data'		=> \AdminHelper::serializeData($user_data)
						);
						\AdminHelper::createAdminLog($admin_logs);
					}

					$corp_name = Corporate::where('corporate_id', $request->get('corporate_id'))->first();
					$user = DB::table('user')->where('UserID', $user_id)->first();

					if($user->communication_type == "email") {
						$emailDdata['emailName']= $request->get('first_name').' '.$request->get('last_name');
						$emailDdata['emailPage']= 'email.mednefits-welcome-member-enrolled';
						$emailDdata['email']= $request->get('email_address');
						$emailDdata['emailTo']= $request->get('email_address');
						$emailDdata['name']= $request->get('first_name').' '.$request->get('last_name');
						$emailDdata['credit']= 0;
						$emailDdata['emailSubject'] = "FOR MEMBER: WELCOME TO MEDNEFITS!";
						$emailDdata['pw'] = $pw;
	                    // $emailDdata['user_id'] = $user_id;
						$emailDdata['company'] = ucwords($corp_name->company_name);
						$emailDdata['plan'] = $active_plan;
	                    // $emailDdata['url'] = $url;
						$emailDdata['start_date'] = date('F d, Y', strtotime($request->get('plan_start')));
						\EmailHelper::sendEmailDirect($emailDdata);
						// $api = "https://api.medicloud.sg/employees/welcome_email";
						// \httpLibrary::postHttp($api, $emailDdata, []);
						$message['status'] = TRUE;
						$message['message'] = "";
						return array('status' => true, 'message' => 'Successfully created Employee Account.');
					} else {
						$phone = \SmsHelper::formatNumber($user);
						if($phone) {
							$compose = [];
							$compose['name'] = $user->Name;
							$compose['company'] = $corp_name->company_name;
							$compose['plan_start'] = date('F d, Y', strtotime($request->get('plan_start')));
							$compose['email'] = $user->Email;
							$compose['nric'] = $user->NRIC;
							$compose['password'] = $pw;
							$compose['phone'] = $phone;

							$compose['message'] = \SmsHelper::formatWelcomeEmployeeMessage($compose);
							$result_sms = \SmsHelper::sendSms($compose);

							if($result_sms['status'] == true) {
								$admin_id = \AdminHelper::getAdminID();
								return array('status' => TRUE, 'message' => 'Successfully created Employee Account.');
							}
						}
					}					
				} else {
					$message['status'] = FALSE;
					$message['message'] = $corp;
				}
			} else {
				$message['status'] = FALSE;
				$message['message'] = $result;
			}
		} else {
			$message['status'] = FALSE;
			$message['message'] = $userData;
		}

		return $message;
	}