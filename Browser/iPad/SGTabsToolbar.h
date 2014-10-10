//
//  SGTabTopView.h
//  SGTabs
//
//  Created by simon on 07.06.12.
//
//
//  Copyright (c) 2012-2013 Simon PEter Grätzer
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

#import <UIKit/UIKit.h>
#import <CoreGraphics/CoreGraphics.h>

#import "SGToolbarView.h"

@interface SGTabsToolbar : SGToolbarView <UIPopoverControllerDelegate>


@property (strong, nonatomic, readonly) UIPopoverController *popoverController;

- (instancetype)initWithFrame:(CGRect)frame browserDelegate:(SGBrowserViewController *)browser;
- (void)updateInterface;
@end
