/*
 * Copyright 2015-present Pop Tech Pty Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>
#import "FillrAutofillInputAccessoryView.h"

typedef enum {
    FillrStateDownloadingApp,
    FillrStateOpenApp,
    FillrStateFormFilled
} FillrSessionState;

@protocol FillrDelegate<NSObject>
- (void)fillrStateChanged:(FillrSessionState)state currentWebView:(UIView *)currentWebView;

- (void)onFillrDismissThresholdExceeded;
- (void)onFillrToolbarVisibilityChanged:(BOOL)isVisible isFillrInstalled:(BOOL)isFillrInstalled;
- (void)onFillrToolbarClicked:(BOOL)isFillrInstalled;
@end

@protocol FillrCloudBrowserDelegate <NSObject>

- (void)onFillButtonClicked:(id)sender;
- (void)onFillApproved:(NSString *)mappings profileData:(NSString *)profileData;

@end

@protocol FillProvider<NSObject>

- (BOOL)canHandleOpenURL:(NSURL *)url;
- (void)handleOpenURL:(NSURL *)url;
- (void)cancel;
- (void)fillForm:(NSString *)mappingMetaData;
- (void)onFillrToolbarShown;
- (void)onFillrToolbarClicked;

@end

@interface Fillr : NSObject <FillrAutofillToolbarDelegate>

@property (assign, nonatomic) BOOL overlayInputAccessoryView;
@property (assign, nonatomic) id <FillrDelegate> delegate;
@property (assign, nonatomic) id <FillrCloudBrowserDelegate> cloudBrowserDelegate;
@property (strong, nonatomic) id <FillProvider> fillProvider;
@property (assign, nonatomic) BOOL enabled;
@property (assign, nonatomic) BOOL visible;
@property UIImage *toolbarIcon;
@property (assign, nonatomic) BOOL isDolphin;
@property (strong, nonatomic) UIColor *toolbarTextColor;
@property (strong, nonatomic) UIColor *toolbarThemeColor;

+ (Fillr *)sharedInstance;

- (void)initialiseWithDevKey:(NSString *)devKey secretKey:(NSString *)secretKey andUrlScheme:(NSString *)urlScheme;

- (void)setBrowserName:(NSString *)browserName toolbarBrowserName:(NSString *)toolbarBrowserName;

- (BOOL)canHandleOpenURL:(NSURL *)url;
- (void)handleOpenURL:(NSURL *)url;
- (void)cancel;

- (BOOL)canHandleWebViewRequest:(NSURLRequest *)request;
- (void)handleWebViewRequest:(NSURLRequest *)request;

- (void)installFillr;
- (BOOL)hasFillrInstalled;
- (void)showDownloadDialog;
- (void)trackWebview:(UIView *)webViewToTrack;
- (BOOL)hasWebview;

- (void)startProcess:(NSString *)json;

- (void)disableForCurrentDomain;

@end
